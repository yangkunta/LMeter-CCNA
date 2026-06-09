// ─── 首頁 ────────────────────────────────────────────────────────
import { Layout } from "./layout";

export function renderHome(clerkKey: string) {
  return (
    <Layout title="首頁" clerkKey={clerkKey}>
      <div style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            background: "linear-gradient(120deg, #89f7fe, #66a6ff, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1rem",
          }}
        >
          CCNA-MT
        </h1>
        <p
          style={{
            fontSize: "1.2rem",
            color: "#9fa8da",
            maxWidth: "600px",
            margin: "0 auto 2rem",
          }}
        >
          AI 驅動的 CCNA 200-301 認證教學專家系統
          <br />
          <span style={{ fontSize: "0.9rem", color: "#616a9e" }}>
            從零基礎到通過認證，AI 導師全程陪你學
          </span>
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginBottom: "3rem",
          }}
        >
          <a href="/portal" class="btn btn-primary">
            🚀 開始學習
          </a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <div class="card">
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤖</div>
            <h3 style={{ marginBottom: "0.5rem", color: "#67e8f9" }}>AI 導師對話</h3>
            <p style={{ fontSize: "0.85rem", color: "#9fa8da" }}>
              不懂就問！AI 專家用通俗語言解釋複雜的網路概念
            </p>
          </div>
          <div class="card">
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
            <h3 style={{ marginBottom: "0.5rem", color: "#4ade80" }}>智慧練習</h3>
            <p style={{ fontSize: "0.85rem", color: "#9fa8da" }}>
              1300+ 題目中英對照，AI 個人化解析答錯原因
            </p>
          </div>
          <div class="card">
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎯</div>
            <h3 style={{ marginBottom: "0.5rem", color: "#fbbf24" }}>模擬考試</h3>
            <p style={{ fontSize: "0.85rem", color: "#9fa8da" }}>
              比照正式考試規格，AI 考後報告指出弱點
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            justifyContent: "center",
            marginTop: "3rem",
          }}
        >
          <span class="badge">Hono + JSX</span>
          <span class="badge">Cloudflare D1</span>
          <span class="badge">Vectorize</span>
          <span class="badge">Gemini AI</span>
          <span class="badge">Clerk Auth</span>
          <span class="badge">TypeScript</span>
        </div>
      </div>
    </Layout>
  );
}
