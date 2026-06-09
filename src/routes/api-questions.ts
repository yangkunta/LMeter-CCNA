// ─── 題庫查詢 API ─────────────────────────────────────────────────
// GET /api/questions       — 列表查詢（支援分類、領域、題庫篩選）
// GET /api/questions/random — 隨機抽題
// GET /api/questions/:id   — 取得單題詳細

import { Hono } from 'hono';
import type { AppEnv } from '../types';

const route = new Hono<AppEnv>();

// ─── 列表查詢 ──────────────────────────────────────────────────────
route.get('/api/questions', async (c) => {
  try {
    const category = c.req.query('category');
    const domain = c.req.query('domain');
    const bank = c.req.query('bank') || 'default';
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const offset = parseInt(c.req.query('offset') || '0');

    // 動態組合 WHERE 條件
    const conditions: string[] = ['bank = ?'];
    const params: (string | number)[] = [bank];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (domain) {
      conditions.push('domain = ?');
      params.push(domain);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    // 查詢題目列表
    const result = await c.env.DB.prepare(
      `SELECT * FROM questions WHERE ${where} ORDER BY "order" ASC LIMIT ? OFFSET ?`
    )
      .bind(...params)
      .all();

    // 計算總數（用於分頁）
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM questions WHERE ${where}`
    )
      .bind(...params.slice(0, -2))
      .first<{ total: number }>();

    return c.json({
      questions: result.results,
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch questions', detail: e?.message }, 500);
  }
});

// ─── 隨機抽題 ──────────────────────────────────────────────────────
route.get('/api/questions/random', async (c) => {
  try {
    const count = Math.min(parseInt(c.req.query('count') || '10'), 100);
    const bank = c.req.query('bank') || 'default';

    // 使用 RANDOM() 抽取指定數量
    const result = await c.env.DB.prepare(
      `SELECT * FROM questions WHERE bank = ? ORDER BY RANDOM() LIMIT ?`
    )
      .bind(bank, count)
      .all();

    return c.json({ questions: result.results, count: result.results.length });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch random questions', detail: e?.message }, 500);
  }
});

// ─── 單題查詢 ──────────────────────────────────────────────────────
route.get('/api/questions/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const question = await c.env.DB.prepare(
      `SELECT * FROM questions WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!question) {
      return c.json({ error: 'Question not found' }, 404);
    }

    return c.json({ question });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch question', detail: e?.message }, 500);
  }
});

export default route;
