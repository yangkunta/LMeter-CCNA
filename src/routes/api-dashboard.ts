// ─── Dashboard API Routes ─────────────────────────────────────────

import { Hono } from "hono";
import type { AppEnv } from "../types";
import { verifyClerkToken, extractToken } from "../auth";
import { getDashboardData, calculateDomainScores } from "../services/dashboard";

const route = new Hono<AppEnv>();

// GET /api/dashboard — 取得完整儀表板資料
route.get("/", async (c) => {
  const token = extractToken(c.req.header("Authorization"));
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const payload = await verifyClerkToken(token);
  if (!payload?.sub) return c.json({ error: "Unauthorized" }, 401);

  try {
    const data = await getDashboardData(c.env.DB, payload.sub);
    return c.json({ data });
  } catch (e: any) {
    return c.json({ error: e?.message || "Failed" }, 500);
  }
});

// GET /api/dashboard/domain-scores — 只取領域分數
route.get("/domain-scores", async (c) => {
  const token = extractToken(c.req.header("Authorization"));
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const payload = await verifyClerkToken(token);
  if (!payload?.sub) return c.json({ error: "Unauthorized" }, 401);

  try {
    const scores = await calculateDomainScores(c.env.DB, payload.sub);
    return c.json({ domainScores: scores });
  } catch (e: any) {
    return c.json({ error: e?.message || "Failed" }, 500);
  }
});

export default route;
