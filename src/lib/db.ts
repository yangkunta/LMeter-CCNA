// ─── Cloudflare D1 資料庫存取層 ────────────────────────────────────
// D1 作為主資料庫，處理所有結構化查詢

import type { Context } from "hono";
import type { AppEnv } from "../types";

/**
 * 從 Hono Context 取得 D1 實例
 */
export const getD1 = (c: Context<AppEnv>): D1Database => {
  return c.env.DB;
};

/**
 * 生成唯一 ID
 */
export const generateId = (): string => {
  return `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
};

/**
 * 安全的 IN 查詢建構器
 */
export const buildInClause = (ids: string[]): { placeholders: string; bindings: string[] } => {
  if (ids.length === 0) return { placeholders: "('')", bindings: [] };
  const placeholders = ids.map(() => "?").join(",");
  return { placeholders: `(${placeholders})`, bindings: ids };
};

/**
 * Unix timestamp (秒)
 */
export const now = (): number => Math.floor(Date.now() / 1000);