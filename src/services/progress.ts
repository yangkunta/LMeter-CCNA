import type {
  DomainScore,
  Bookmark,
  BookmarkType,
} from '../types';
import { CCNA_DOMAINS } from '../types';

// ─── D1 原始行型別 ─────────────────────────────────────────────────
interface DomainStatRow {
  domain: string;
  total: number;
  correct: number;
}

interface BookmarkRow {
  question_id: string;
  type: string;
  wrong_count: number;
  last_wrong_at: number | null;
  bank: string;
}

// ═══════════════════════════════════════════════════════════════════
// Progress Service — 使用者學習進度服務
// ═══════════════════════════════════════════════════════════════════

/**
 * 計算使用者各領域得分
 * 從 answer_records 聚合統計每個 domain 的正確率
 * 透過 JOIN questions 表取得 domain 資訊
 */
export async function getUserDomainScores(
  db: D1Database,
  userId: string
): Promise<DomainScore[]> {
  const { results } = await db
    .prepare(
      `SELECT q.domain, 
              COUNT(*) as total, 
              SUM(ar.is_correct) as correct
       FROM answer_records ar
       JOIN questions q ON ar.question_id = q.id
       WHERE ar.user_id = ?
       GROUP BY q.domain`
    )
    .bind(userId)
    .all<DomainStatRow>();

  const statsMap = new Map<string, DomainStatRow>();
  for (const row of results ?? []) {
    statsMap.set(row.domain, row);
  }

  // 為每個 CCNA 領域生成分數（即使沒有答題記錄也回傳 0）
  return CCNA_DOMAINS.map((d) => {
    const stat = statsMap.get(d.id);
    const total = stat?.total ?? 0;
    const correct = stat?.correct ?? 0;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return {
      domain: d.id,
      domainName: d.name,
      score,
      total,
      correct,
      weight: d.weight,
    };
  });
}

/**
 * 記錄使用者答題
 * 1. 寫入 answer_records
 * 2. 如果答錯，自動加入 / 更新錯題本
 * 3. 如果答對且錯題本中存在，不移除（需手動移除）
 */
export async function recordAnswer(
  db: D1Database,
  userId: string,
  questionId: string,
  selectedAnswer: string[],
  isCorrect: boolean,
  mode: string,
  timeMs: number,
  bank: string
): Promise<void> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  // 寫入答題記錄
  await db
    .prepare(
      `INSERT INTO answer_records (id, user_id, question_id, selected_answer_json, is_correct, mode, time_spent_ms, bank, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, userId, questionId, JSON.stringify(selectedAnswer), isCorrect ? 1 : 0, mode, timeMs, bank, now)
    .run();

  // 答錯時自動更新錯題本（使用 UPSERT 避免重複）
  if (!isCorrect) {
    await db
      .prepare(
        `INSERT INTO user_bookmarks (user_id, question_id, type, wrong_count, last_wrong_at, bank, created_at)
         VALUES (?, ?, 'wrong', 1, ?, ?, ?)
         ON CONFLICT(user_id, question_id, type, bank) 
         DO UPDATE SET wrong_count = wrong_count + 1, last_wrong_at = ?`
      )
      .bind(userId, questionId, now, bank, now, now)
      .run();
  }
}

/**
 * 取得使用者收藏 / 錯題列表
 * 支援按 type 和 bank 篩選
 */
export async function getBookmarks(
  db: D1Database,
  userId: string,
  type: BookmarkType,
  bank?: string
): Promise<Bookmark[]> {
  const whereClause = bank
    ? 'WHERE user_id = ? AND type = ? AND bank = ?'
    : 'WHERE user_id = ? AND type = ?';
  const params: unknown[] = bank
    ? [userId, type, bank]
    : [userId, type];

  const { results } = await db
    .prepare(
      `SELECT question_id, type, wrong_count, last_wrong_at, bank
       FROM user_bookmarks ${whereClause}
       ORDER BY created_at DESC`
    )
    .bind(...params)
    .all<BookmarkRow>();

  return (results ?? []).map((row) => ({
    questionId: row.question_id,
    type: row.type as BookmarkType,
    wrongCount: row.wrong_count,
    lastWrongAt: row.last_wrong_at,
    bank: row.bank,
  }));
}

/**
 * 切換收藏狀態（星標）
 * 已收藏 → 取消；未收藏 → 加入
 * 回傳操作後的狀態
 */
export async function toggleBookmark(
  db: D1Database,
  userId: string,
  questionId: string,
  type: BookmarkType,
  bank: string
): Promise<{ bookmarked: boolean }> {
  // 檢查是否已存在
  const existing = await db
    .prepare(
      `SELECT 1 FROM user_bookmarks 
       WHERE user_id = ? AND question_id = ? AND type = ? AND bank = ?`
    )
    .bind(userId, questionId, type, bank)
    .first();

  if (existing) {
    // 已存在 → 刪除
    await db
      .prepare(
        `DELETE FROM user_bookmarks 
         WHERE user_id = ? AND question_id = ? AND type = ? AND bank = ?`
      )
      .bind(userId, questionId, type, bank)
      .run();
    return { bookmarked: false };
  } else {
    // 不存在 → 新增
    const now = Math.floor(Date.now() / 1000);
    await db
      .prepare(
        `INSERT INTO user_bookmarks (user_id, question_id, type, wrong_count, last_wrong_at, bank, created_at)
         VALUES (?, ?, ?, 0, NULL, ?, ?)`
      )
      .bind(userId, questionId, type, bank, now)
      .run();
    return { bookmarked: true };
  }
}

/**
 * 從錯題本移除指定題目
 * 通常在使用者複習答對後手動移除
 */
export async function removeWrongQuestion(
  db: D1Database,
  userId: string,
  questionId: string,
  bank: string
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM user_bookmarks 
       WHERE user_id = ? AND question_id = ? AND type = 'wrong' AND bank = ?`
    )
    .bind(userId, questionId, bank)
    .run();
}

/**
 * 取得最常答錯的題目（按錯誤次數降序）
 * 用於推薦複習
 */
export async function getFrequentlyWrong(
  db: D1Database,
  userId: string,
  limit: number = 10,
  bank?: string
): Promise<Bookmark[]> {
  const whereClause = bank
    ? "WHERE user_id = ? AND type = 'wrong' AND bank = ?"
    : "WHERE user_id = ? AND type = 'wrong'";
  const params: unknown[] = bank
    ? [userId, bank, limit]
    : [userId, limit];

  const { results } = await db
    .prepare(
      `SELECT question_id, type, wrong_count, last_wrong_at, bank
       FROM user_bookmarks ${whereClause}
       ORDER BY wrong_count DESC
       LIMIT ?`
    )
    .bind(...params)
    .all<BookmarkRow>();

  return (results ?? []).map((row) => ({
    questionId: row.question_id,
    type: row.type as BookmarkType,
    wrongCount: row.wrong_count,
    lastWrongAt: row.last_wrong_at,
    bank: row.bank,
  }));
}
