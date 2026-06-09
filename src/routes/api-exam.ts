// ─── 模擬考試 API ─────────────────────────────────────────────────
// POST   /api/exam/submit  — 提交考試
// GET    /api/exam/history  — 考試歷史
// DELETE /api/exam/:id      — 刪除考試紀錄

import { Hono } from 'hono';
import type { AppEnv, DomainScore } from '../types';
import { verifyClerkToken, extractToken } from '../auth';

const route = new Hono<AppEnv>();

// ─── 驗證身份 ──────────────────────────────────────────────────────
async function requireAuth(c: any): Promise<{ userId: string } | Response> {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const payload = await verifyClerkToken(token);
  if (!payload?.sub) return c.json({ error: 'Unauthorized' }, 401);
  return { userId: payload.sub };
}

// ─── 提交考試 ──────────────────────────────────────────────────────
route.post('/api/exam/submit', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const body = await c.req.json<{
      answers: Record<string, string[]>;
      durationSeconds: number;
      bank: string;
      passThreshold?: number;
    }>();

    const { answers, durationSeconds, bank } = body;
    const passThreshold = body.passThreshold || 825; // CCNA 及格分數 825/1000

    if (!answers || Object.keys(answers).length === 0) {
      return c.json({ error: 'No answers provided' }, 400);
    }

    // 取得所有作答題目的正確答案
    const questionIds = Object.keys(answers);
    const placeholders = questionIds.map(() => '?').join(',');
    const questionsResult = await c.env.DB.prepare(
      `SELECT id, domain, answer FROM questions WHERE id IN (${placeholders})`
    )
      .bind(...questionIds)
      .all();

    const questionMap = new Map<string, { domain: string; answer: string[] }>();
    for (const q of questionsResult.results as any[]) {
      questionMap.set(q.id, {
        domain: q.domain,
        answer: typeof q.answer === 'string' ? JSON.parse(q.answer) : q.answer,
      });
    }

    // 計算各領域得分
    const domainStats = new Map<string, { correct: number; total: number }>();
    const wrongQuestionIds: string[] = [];
    let totalCorrect = 0;

    for (const [qId, userAnswer] of Object.entries(answers)) {
      const question = questionMap.get(qId);
      if (!question) continue;

      // 初始化領域計數
      if (!domainStats.has(question.domain)) {
        domainStats.set(question.domain, { correct: 0, total: 0 });
      }
      const stats = domainStats.get(question.domain)!;
      stats.total++;

      // 判斷答案是否正確（排序後比較）
      const correctSorted = [...question.answer].sort().join(',');
      const userSorted = [...userAnswer].sort().join(',');
      const isCorrect = correctSorted === userSorted;

      if (isCorrect) {
        stats.correct++;
        totalCorrect++;
      } else {
        wrongQuestionIds.push(qId);
      }
    }

    // 組裝領域分數
    const domainScores: DomainScore[] = Array.from(domainStats.entries()).map(
      ([domain, stats]) => ({
        domain,
        domainName: domain,
        score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        total: stats.total,
        correct: stats.correct,
        weight: 0, // 前端/報告層補上權重
      })
    );

    const totalQuestions = questionIds.length;
    const overallScore = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 1000) // 換算為 1000 分制
      : 0;
    const passed = overallScore >= passThreshold;

    // 寫入考試紀錄
    const examId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO exam_records (id, user_id, score, passed, total_questions, correct_count, duration_seconds, pass_threshold, domain_scores, wrong_question_ids, ai_report, bank, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
    )
      .bind(
        examId, userId, overallScore, passed ? 1 : 0,
        totalQuestions, totalCorrect, durationSeconds || 0,
        passThreshold, JSON.stringify(domainScores),
        JSON.stringify(wrongQuestionIds), bank || 'default', Date.now()
      )
      .run();

    // 同步將錯題寫入錯題本
    for (const wrongId of wrongQuestionIds) {
      await c.env.DB.prepare(
        `INSERT INTO bookmarks (user_id, question_id, type, wrong_count, last_wrong_at, bank)
         VALUES (?, ?, 'wrong', 1, ?, ?)
         ON CONFLICT(user_id, question_id, type) DO UPDATE SET
           wrong_count = wrong_count + 1,
           last_wrong_at = ?`
      )
        .bind(userId, wrongId, Date.now(), bank || 'default', Date.now())
        .run();
    }

    return c.json({
      examId,
      score: overallScore,
      passed,
      totalQuestions,
      correctCount: totalCorrect,
      domainScores,
      wrongQuestionIds,
    });
  } catch (e: any) {
    return c.json({ error: 'Failed to submit exam', detail: e?.message }, 500);
  }
});

// ─── 考試歷史 ──────────────────────────────────────────────────────
route.get('/api/exam/history', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

    const result = await c.env.DB.prepare(
      `SELECT * FROM exam_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
      .bind(userId, limit)
      .all();

    // 解析 JSON 欄位
    const exams = result.results.map((r: any) => ({
      ...r,
      domainScores: typeof r.domain_scores === 'string' ? JSON.parse(r.domain_scores) : r.domain_scores,
      wrongQuestionIds: typeof r.wrong_question_ids === 'string' ? JSON.parse(r.wrong_question_ids) : r.wrong_question_ids,
    }));

    return c.json({ exams, total: exams.length });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch exam history', detail: e?.message }, 500);
  }
});

// ─── 刪除考試紀錄 ──────────────────────────────────────────────────
route.delete('/api/exam/:id', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const examId = c.req.param('id');

    // 確保只能刪除自己的紀錄
    const result = await c.env.DB.prepare(
      `DELETE FROM exam_records WHERE id = ? AND user_id = ?`
    )
      .bind(examId, userId)
      .run();

    return c.json({ success: true, deleted: result.meta.changes > 0 });
  } catch (e: any) {
    return c.json({ error: 'Failed to delete exam record', detail: e?.message }, 500);
  }
});

export default route;
