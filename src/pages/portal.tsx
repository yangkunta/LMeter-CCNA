// ─── Portal 入口頁 ───────────────────────────────────────────────
import { Layout } from "./layout";

const NAV_CARDS = [
  { href: "/practice", icon: "📝", title: "刷題練習", desc: "中英對照題庫，AI 解析", color: "#4ade80" },
  { href: "/exam", icon: "🎯", title: "模擬考試", desc: "120 分鐘仿真測試", color: "#fbbf24" },
  { href: "/tutor", icon: "🤖", title: "AI 導師", desc: "對話式教學，隨時問答", color: "#67e8f9" },
  { href: "/dashboard", icon: "📊", title: "學習儀表板", desc: "進度追蹤、成績分析", color: "#a78bfa" },
];

export function renderPortal(clerkKey: string) {
  return (
    <Layout title="Portal" clerkKey={clerkKey}>
      <div style={{ paddingTop: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>👋 歡迎回來</h1>
        <p style={{ color: "#9fa8da", marginBottom: "2rem" }}>選擇你要進行的學習活動</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {NAV_CARDS.map((card) => (
            <a
              href={card.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                class="card"
                style={{ cursor: "pointer", minHeight: "160px" }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
                  {card.icon}
                </div>
                <h2 style={{ fontSize: "1.3rem", color: card.color, marginBottom: "0.5rem" }}>
                  {card.title}
                </h2>
                <p style={{ fontSize: "0.9rem", color: "#9fa8da" }}>
                  {card.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </Layout>
  );
}
