// ─── Cloudflare Vectorize 向量搜尋層 ──────────────────────────────
// 用於題目智慧搜尋、相似內容推薦

import type { Context } from "hono";
import type { Bindings } from "../types";

/**
 * 從 Hono Context 取得 Vectorize 實例
 */
export const getVectorIndex = (
  c: Context<{ Bindings: Bindings }>
): VectorizeIndex => {
  return c.env.VECTOR_INDEX;
};

/**
 * 執行相似度搜尋
 */
export const searchSimilarContent = async (
  index: VectorizeIndex,
  queryVector: number[],
  topK: number = 5
) => {
  const result = await index.query(queryVector, {
    topK,
    returnMetadata: "all",
  });
  return result.matches;
};
