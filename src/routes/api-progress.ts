// ─── 學習進度 API ─────────────────────────────────────────────────
// POST /api/answer              — 記錄作答
// GET  /api/bookmarks           — 取得收藏/錯題
// POST /api/bookmarks/toggle    — 切換收藏
// DELETE /api/bookmarks/wrong/:questionId — 移除錯題
// GET  /api/wrong               — 高頻錯題

import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { verifyClerkToken, extractToken } from '../auth';

const route = new Hono<AppEnv>();

// ─── 驗證身份的輔助函式 ────────────────────────────────────────────
async function requireAuth(c: any): Promise<{ userId: string } | Response> {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const payload = await verifyClerkToken(token);
  if (!payload?.sub) return c.json({ error: 'Unauthorized' }, 401);
  return { userId: payload.sub };
}

// ─── 記錄作答 ──────────────────────────────────────────────────────
route.post('/api/answer', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const body = await c.req.json<{
      questionId: string;
      selectedAnswer: string[];
      isCorrect: boolean;
      mode: string;
      timeMs: number;
      bank: string;
    }>();

    const { questionId, selectedAnswer, isCorrect, mode, timeMs, bank } = body;

    if (!questionId) {
      return c.json({ error: 'questionId is required' }, 400);
    }

    // 寫入答題記錄
    await c.env.DB.prepare(
      `INSERT INTO answer_records (user_id, question_id, selected_answer, is_correct, mode, time_ms, bank, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, questionId, JSON.stringify(selectedAnswer), isCorrect ? 1 : 0, mode || 'practice', timeMs || 0, bank || 'default', Date.now())
      .run();

    // 如果答錯，自動加入錯題本
    if (!isCorrect) {
      await c.env.DB.prepare(
        `INSERT INTO bookmarks (user_id, question_id, type, wrong_count, last_wrong_at, bank)
         VALUES (?, ?, 'wrong', 1, ?, ?)
         ON CONFLICT(user_id, question_id, type) DO UPDATE SET
           wrong_count = wrong_count + 1,
           last_wrong_at = ?`
      )
        .bind(userId, questionId, Date.now(), bank || 'default', Date.now())
        .run();
    }

    return c.json({ success: true, isCorrect });
  } catch (e: any) {
    return c.json({ error: 'Failed to record answer', detail: e?.message }, 500);
  }
});

// ─── 取得收藏/錯題 ────────────────────────────────────────────────
route.get('/api/bookmarks', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const type = c.req.query('type') || 'star'; // star | wrong
    const bank = c.req.query('bank') || 'default';

    const result = await c.env.DB.prepare(
      `SELECT b.*, q.category, q.domain, q.question_en, q.question_zh
       FROM bookmarks b
       LEFT JOIN questions q ON b.question_id = q.id
       WHERE b.user_id = ? AND b.type = ? AND b.bank = ?
       ORDER BY b.last_wrong_at DESC`
    )
      .bind(userId, type, bank)
      .all();

    return c.json({ bookmarks: result.results, total: result.results.length });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch bookmarks', detail: e?.message }, 500);
  }
});

// ─── 切換收藏 ──────────────────────────────────────────────────────
route.post('/api/bookmarks/toggle', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const body = await c.req.json<{
      questionId: string;
      type: 'star' | 'wrong';
      bank: string;
    }>();

    const { questionId, type, bank } = body;
    if (!questionId) return c.json({ error: 'questionId is required' }, 400);

    const bookmarkType = type || 'star';
    const bookmarkBank = bank || 'default';

    // 檢查是否已存在
    const existing = await c.env.DB.prepare(
      `SELECT id FROM bookmarks WHERE user_id = ? AND question_id = ? AND type = ? AND bank = ?`
    )
      .bind(userId, questionId, bookmarkType, bookmarkBank)
      .first();

    if (existing) {
      // 已存在則刪除（取消收藏）
      await c.env.DB.prepare(
        `DELETE FROM bookmarks WHERE user_id = ? AND question_id = ? AND type = ? AND bank = ?`
      )
        .bind(userId, questionId, bookmarkType, bookmarkBank)
        .run();
      return c.json({ toggled: false, action: 'removed' });
    } else {
      // 不存在則新增（加入收藏）
      await c.env.DB.prepare(
        `INSERT INTO bookmarks (user_id, question_id, type, wrong_count, last_wrong_at, bank)
         VALUES (?, ?, ?, 0, NULL, ?)`
      )
        .bind(userId, questionId, bookmarkType, bookmarkBank)
        .run();
      return c.json({ toggled: true, action: 'added' });
    }
  } catch (e: any) {
    return c.json({ error: 'Failed to toggle bookmark', detail: e?.message }, 500);
  }
});

// ─── 移除錯題 ──────────────────────────────────────────────────────
route.delete('/api/bookmarks/wrong/:questionId', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const questionId = c.req.param('questionId');
    const bank = c.req.query('bank') || 'default';

    await c.env.DB.prepare(
      `DELETE FROM bookmarks WHERE user_id = ? AND question_id = ? AND type = 'wrong' AND bank = ?`
    )
      .bind(userId, questionId, bank)
      .run();

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: 'Failed to remove wrong bookmark', detail: e?.message }, 500);
  }
});

// ─── 高頻錯題 ──────────────────────────────────────────────────────
route.get('/api/wrong', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const bank = c.req.query('bank') || 'default';

    // 按錯誤次數降序排列
    const result = await c.env.DB.prepare(
      `SELECT b.*, q.category, q.domain, q.question_en, q.question_zh, q.explanation_zh
       FROM bookmarks b
       LEFT JOIN questions q ON b.question_id = q.id
       WHERE b.user_id = ? AND b.type = 'wrong' AND b.bank = ?
       ORDER BY b.wrong_count DESC, b.last_wrong_at DESC
       LIMIT ?`
    )
      .bind(userId, bank, limit)
      .all();

    return c.json({ questions: result.results, total: result.results.length });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch wrong questions', detail: e?.message }, 500);
  }
});

// ─── 領域掌握度分析 ──────────────────────────────────────────────────
route.get('/api/progress/mastery', async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { userId } = auth;

    // 計算每個 domain 的總題數與答對題數
    const result = await c.env.DB.prepare(
      `SELECT q.domain, COUNT(*) as total, SUM(a.is_correct) as correct
       FROM answer_records a
       JOIN questions q ON a.question_id = q.id
       WHERE a.user_id = ?
       GROUP BY q.domain`
    )
      .bind(userId)
      .all();

    return c.json({ mastery: result.results });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch mastery', detail: e?.message }, 500);
  }
});

export default route;
