import type {
  Question,
  QuestionOption,
  QuestionKeyword,
  QuestionType,
} from '../types';

// ─── D1 原始行型別（資料庫欄位對應）────────────────────────────────
interface QuestionRow {
  id: string;
  category: string;
  domain: string;
  type: string;
  question_en: string;
  question_zh: string;
  options_json: string;
  answer_json: string;
  explanation_zh: string | null;
  keywords_json: string | null;
  image_url: string | null;
  answer_image_url: string | null;
  extra_images_json: string | null;
  difficulty: number;
  order: number;
  bank: string;
}

// ─── 查詢篩選參數 ──────────────────────────────────────────────────
export interface QuestionFilter {
  category?: string;
  domain?: string;
  bank?: string;
  limit?: number;
  offset?: number;
}

// ─── Helper: 將 D1 行轉為 Question 型別（解析 JSON 欄位）──────────
export function parseQuestionRow(row: QuestionRow): Question {
  return {
    id: row.id,
    category: row.category,
    domain: row.domain,
    type: row.type as QuestionType,
    questionEn: row.question_en,
    questionZh: row.question_zh,
    options: safeParseJson<QuestionOption[]>(row.options_json, []),
    answer: safeParseJson<string[]>(row.answer_json, []),
    explanationZh: row.explanation_zh ?? '',
    keywords: safeParseJson<QuestionKeyword[]>(row.keywords_json, []),
    imageUrl: row.image_url,
    answerImageUrl: row.answer_image_url,
    extraImages: safeParseJson<string[]>(row.extra_images_json, []),
    difficulty: row.difficulty,
    order: row.order,
    bank: row.bank,
  };
}

/**
 * 安全解析 JSON 字串，失敗時回傳預設值
 */
function safeParseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Question Service — 題目 CRUD 服務
// ═══════════════════════════════════════════════════════════════════

/**
 * 取得題目列表（分頁 + 篩選）
 * 支援按 category / domain / bank 篩選，預設回傳 20 筆
 */
export async function getQuestions(
  db: D1Database,
  filter: QuestionFilter = {}
): Promise<{ questions: Question[]; total: number }> {
  const { category, domain, bank, limit = 20, offset = 0 } = filter;

  // 動態組裝 WHERE 條件
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (domain) {
    conditions.push('domain = ?');
    params.push(domain);
  }
  if (bank) {
    conditions.push('bank = ?');
    params.push(bank);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // 取得符合條件的總數
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM questions ${whereClause}`)
    .bind(...params)
    .first<{ count: number }>();

  const total = countResult?.count ?? 0;

  // 取得分頁資料（按 order 排序）
  const { results } = await db
    .prepare(
      `SELECT * FROM questions ${whereClause} ORDER BY "order" ASC, id ASC LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all<QuestionRow>();

  const questions = (results ?? []).map(parseQuestionRow);
  return { questions, total };
}

/**
 * 根據 ID 取得單一題目
 */
export async function getQuestionById(
  db: D1Database,
  id: string
): Promise<Question | null> {
  const row = await db
    .prepare('SELECT * FROM questions WHERE id = ?')
    .bind(id)
    .first<QuestionRow>();

  return row ? parseQuestionRow(row) : null;
}

/**
 * 隨機抽取題目（用於模擬考）
 * 使用 D1 的 RANDOM() 函數，可按 bank 篩選
 */
export async function getRandomQuestions(
  db: D1Database,
  count: number,
  bank?: string
): Promise<Question[]> {
  const whereClause = bank ? 'WHERE bank = ?' : '';
  const params: unknown[] = bank ? [bank, count] : [count];

  const { results } = await db
    .prepare(
      `SELECT * FROM questions ${whereClause} ORDER BY RANDOM() LIMIT ?`
    )
    .bind(...params)
    .all<QuestionRow>();

  return (results ?? []).map(parseQuestionRow);
}

/**
 * 批量取得題目（根據 ID 陣列）
 * 用於從考試記錄中還原題目詳情
 */
export async function getQuestionsByIds(
  db: D1Database,
  ids: string[]
): Promise<Question[]> {
  if (ids.length === 0) return [];

  // D1 不支援 IN (?) 陣列綁定，需手動產生佔位符
  const placeholders = ids.map(() => '?').join(', ');
  const { results } = await db
    .prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<QuestionRow>();

  return (results ?? []).map(parseQuestionRow);
}
