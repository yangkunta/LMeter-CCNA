import type {
  Question,
  ExamRecord,
  ExamSubmission,
  DomainScore,
} from '../types';
import { CCNA_DOMAINS } from '../types';
import { getQuestionsByIds } from './question';
import { recordAnswer } from './progress';

// ─── D1 原始行型別 ─────────────────────────────────────────────────
interface ExamRow {
  id: string;
  user_id: string;
  score: number;
  passed: number;
  total_questions: number;
  correct_count: number;
  duration_seconds: number;
  pass_threshold: number;
  domain_scores_json: string | null;
  wrong_question_ids_json: string | null;
  ai_report: string | null;
  bank: string;
  created_at: number;
}

/**
 * 安全解析 JSON 字串
 */
function safeParseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * 將 D1 行轉為 ExamRecord 型別
 */
function parseExamRow(row: ExamRow): ExamRecord {
  return {
    id: row.id,
    score: row.score,
    passed: row.passed === 1,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    durationSeconds: row.duration_seconds,
    passThreshold: row.pass_threshold,
    domainScores: safeParseJson<DomainScore[]>(row.domain_scores_json, []),
    wrongQuestionIds: safeParseJson<string[]>(row.wrong_question_ids_json, []),
    aiReport: row.ai_report,
    bank: row.bank,
    createdAt: row.created_at,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Exam Service — 模擬考服務
// ═══════════════════════════════════════════════════════════════════

/**
 * 計算考試各領域得分（純邏輯函式，不涉及 DB）
 * 將每道題按 domain 分組，計算正確率
 */
export function gradeExam(
  questions: Question[],
  answers: Record<string, string[]>
): {
  score: number;
  correctCount: number;
  wrongQuestionIds: string[];
  domainScores: DomainScore[];
} {
  // 按 domain 統計
  const domainStats = new Map<string, { total: number; correct: number }>();
  let totalCorrect = 0;
  const wrongIds: string[] = [];

  for (const q of questions) {
    // 初始化 domain 統計
    if (!domainStats.has(q.domain)) {
      domainStats.set(q.domain, { total: 0, correct: 0 });
    }
    const stat = domainStats.get(q.domain)!;
    stat.total++;

    // 比對答案（排序後比較，避免順序影響）
    const userAnswer = answers[q.id] ?? [];
    const correctAnswer = [...q.answer].sort();
    const userSorted = [...userAnswer].sort();
    const isCorrect =
      correctAnswer.length === userSorted.length &&
      correctAnswer.every((a, i) => a === userSorted[i]);

    if (isCorrect) {
      stat.correct++;
      totalCorrect++;
    } else {
      wrongIds.push(q.id);
    }
  }

  // 計算總分（百分制）
  const totalQuestions = questions.length;
  const score = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100 * 10) / 10
    : 0;

  // 生成各領域得分
  const domainScores: DomainScore[] = CCNA_DOMAINS.map((d) => {
    const stat = domainStats.get(d.id);
    const total = stat?.total ?? 0;
    const correct = stat?.correct ?? 0;
    const domainScore = total > 0 ? Math.round((correct / total) * 100) : 0;
    return {
      domain: d.id,
      domainName: d.name,
      score: domainScore,
      total,
      correct,
      weight: d.weight,
    };
  });

  return { score, correctCount: totalCorrect, wrongQuestionIds: wrongIds, domainScores };
}

/**
 * 提交考試
 * 1. 從 DB 取出所有考題
 * 2. 批改計分
 * 3. 逐題記錄答題（更新錯題本）
 * 4. 儲存考試記錄
 * 5. 回傳完整 ExamRecord
 */
export async function submitExam(
  db: D1Database,
  userId: string,
  submission: ExamSubmission
): Promise<ExamRecord> {
  const { answers, durationSeconds, bank, passThreshold = 75 } = submission;
  const questionIds = Object.keys(answers);

  // 取出所有考題
  const questions = await getQuestionsByIds(db, questionIds);

  // 批改考試
  const { score, correctCount, wrongQuestionIds, domainScores } = gradeExam(questions, answers);
  const passed = score >= passThreshold;

  // 逐題記錄答題（同時更新錯題本）
  for (const q of questions) {
    const userAnswer = answers[q.id] ?? [];
    const isCorrect = !wrongQuestionIds.includes(q.id);
    await recordAnswer(db, userId, q.id, userAnswer, isCorrect, 'exam', 0, bank);
  }

  // 儲存考試記錄
  const examId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO exam_records 
       (id, user_id, score, passed, total_questions, correct_count, duration_seconds, pass_threshold, domain_scores_json, wrong_question_ids_json, ai_report, bank, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
    )
    .bind(
      examId,
      userId,
      score,
      passed ? 1 : 0,
      questions.length,
      correctCount,
      durationSeconds,
      passThreshold / 100,
      JSON.stringify(domainScores),
      JSON.stringify(wrongQuestionIds),
      bank,
      now
    )
    .run();

  return {
    id: examId,
    score,
    passed,
    totalQuestions: questions.length,
    correctCount,
    durationSeconds,
    passThreshold: passThreshold / 100,
    domainScores,
    wrongQuestionIds,
    aiReport: null,
    bank,
    createdAt: now,
  };
}

/**
 * 取得考試歷史記錄（按時間降序）
 */
export async function getExamHistory(
  db: D1Database,
  userId: string,
  limit: number = 20
): Promise<ExamRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM exam_records 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`
    )
    .bind(userId, limit)
    .all<ExamRow>();

  return (results ?? []).map(parseExamRow);
}

/**
 * 刪除指定考試記錄（僅限本人）
 */
export async function deleteExamRecord(
  db: D1Database,
  userId: string,
  examId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM exam_records WHERE id = ? AND user_id = ?`
    )
    .bind(examId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
