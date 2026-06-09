import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";
import { verifyClerkToken, extractToken } from "./auth";

// ─── Route imports ────────────────────────────────────────────────
import questionRoutes from "./routes/api-questions";
import progressRoutes from "./routes/api-progress";
import examRoutes from "./routes/api-exam";
import tutorRoutes from "./routes/api-tutor";
import dashboardRoutes from "./routes/api-dashboard";

// ─── Page imports ─────────────────────────────────────────────────
import { renderHome } from "./pages/home";
import { renderPortal } from "./pages/portal";
import { renderTutor } from "./pages/tutor";

const app = new Hono<AppEnv>();

// ─── CORS ─────────────────────────────────────────────────────────
app.use("/api/*", cors());

// ─── Rate Limiting ────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120;
const RATE_WINDOW = 60_000;

app.use("/api/*", async (c, next) => {
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
  } else {
    entry.count++;
    if (entry.count > RATE_LIMIT) {
      return c.json({ error: "Too many requests" }, 429);
    }
  }
  await next();
});

// ─── API Routes ───────────────────────────────────────────────────
app.route("/api/questions", questionRoutes);
app.route("/api", progressRoutes);
app.route("/api/exam", examRoutes);
app.route("/api/tutor", tutorRoutes);
app.route("/api/dashboard", dashboardRoutes);

// ─── API: Status ──────────────────────────────────────────────────
app.get("/api/status", (c) => {
  return c.json({
    name: "LearnMentorCCNA",
    status: "online",
    runtime: "Cloudflare Workers",
    architecture: "Hono + JSX + D1 + Vectorize + Firestore(REST) + AI",
  });
});

// ─── API: D1 Health Check ─────────────────────────────────────────
app.get("/api/health/d1", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    return c.json({
      status: "connected",
      tables: result.results.map((r: any) => r.name),
    });
  } catch (e: any) {
    return c.json(
      { status: "error", message: e?.message || String(e) },
      500
    );
  }
});

// ─── 前端頁面路由 ──────────────────────────────────────────────────

app.get("/", (c) => {
  const clerkKey = c.env.CLERK_PUBLISHABLE_KEY || "";
  return c.html(renderHome(clerkKey));
});

app.get("/portal", (c) => {
  const clerkKey = c.env.CLERK_PUBLISHABLE_KEY || "";
  return c.html(renderPortal(clerkKey));
});

// Placeholder pages (Phase 2+)
app.get("/practice", (c) => {
  return c.html(renderPortal(c.env.CLERK_PUBLISHABLE_KEY || ""));
});

app.get("/exam", (c) => {
  return c.html(renderPortal(c.env.CLERK_PUBLISHABLE_KEY || ""));
});

app.get("/tutor", (c) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  return c.html(renderTutor(c.env.CLERK_PUBLISHABLE_KEY || ""));
});

app.get("/dashboard", (c) => {
  return c.html(renderPortal(c.env.CLERK_PUBLISHABLE_KEY || ""));
});

export default app;
