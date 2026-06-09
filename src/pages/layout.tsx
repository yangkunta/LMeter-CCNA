// ─── 共用 HTML 版型 ───────────────────────────────────────────────
import type { Child } from "hono/jsx";

interface LayoutProps {
  title: string;
  clerkKey?: string;
  children: Child;
}

export function Layout({ title, clerkKey, children }: LayoutProps) {
  return (
    <html lang="zh-TW">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} | CCNA-MT</title>
        <meta name="description" content="AI 驅動的 CCNA 認證教學專家系統" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --bg-primary: #0f0c29;
            --bg-secondary: #1a1640;
            --bg-card: rgba(255,255,255,0.04);
            --text-primary: #e8eaf6;
            --text-secondary: #9fa8da;
            --text-muted: #616a9e;
            --accent-blue: #7c8cf8;
            --accent-cyan: #67e8f9;
            --accent-green: #4ade80;
            --accent-amber: #fbbf24;
            --accent-red: #f87171;
            --gradient-main: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            --gradient-accent: linear-gradient(120deg, #89f7fe, #66a6ff);
            --border-subtle: rgba(255,255,255,0.08);
            --radius: 12px;
            --radius-lg: 20px;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', 'Noto Sans TC', system-ui, sans-serif;
            background: var(--gradient-main);
            color: var(--text-primary);
            min-height: 100vh;
            line-height: 1.6;
          }
          a { color: var(--accent-blue); text-decoration: none; }
          a:hover { text-decoration: underline; }

          .nav {
            display: flex; align-items: center; justify-content: space-between;
            padding: 1rem 2rem;
            background: rgba(15,12,41,0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border-subtle);
            position: sticky; top: 0; z-index: 100;
          }
          .nav-brand {
            font-size: 1.3rem; font-weight: 700;
            background: var(--gradient-accent);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          }
          .nav-links { display: flex; gap: 1.5rem; align-items: center; }
          .nav-links a {
            color: var(--text-secondary); font-size: 0.9rem; font-weight: 500;
            transition: color 0.2s;
          }
          .nav-links a:hover { color: var(--text-primary); text-decoration: none; }

          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }

          .card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius);
            padding: 1.5rem;
            transition: transform 0.2s, border-color 0.2s;
          }
          .card:hover {
            transform: translateY(-2px);
            border-color: rgba(124,140,248,0.3);
          }

          .btn {
            display: inline-flex; align-items: center; gap: 0.5rem;
            padding: 0.6rem 1.5rem;
            border-radius: 8px; border: none;
            font-weight: 600; font-size: 0.9rem;
            cursor: pointer; transition: all 0.2s;
          }
          .btn-primary {
            background: var(--gradient-accent);
            color: #0f0c29;
          }
          .btn-primary:hover { opacity: 0.9; transform: scale(1.02); }

          .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--border-subtle);
            border-radius: 2rem;
            font-size: 0.75rem;
            color: var(--accent-blue);
          }

          @media (max-width: 768px) {
            .container { padding: 1rem; }
            .nav { padding: 0.75rem 1rem; }
            .nav-links { gap: 1rem; }
          }
        `}</style>
      </head>
      <body>
        <nav class="nav">
          <a href="/" class="nav-brand">CCNA-MT</a>
          <div class="nav-links">
            <a href="/portal">Portal</a>
            <a href="#" onclick="alert('還在規畫中'); return false;">刷題</a>
            <a href="#" onclick="alert('還在規畫中'); return false;">模擬考</a>
            <a href="/tutor">AI 導師</a>
            <a href="#" onclick="alert('還在規畫中'); return false;">儀表板</a>
          </div>
          <div id="user-button"></div>
        </nav>
        <main class="container">
          {children}
        </main>
        {clerkKey && (
          <script dangerouslySetInnerHTML={{ __html: `
            const clerkPubKey = '${clerkKey}';
            const script = document.createElement('script');
            script.setAttribute('data-clerk-publishable-key', clerkPubKey);
            script.async = true;
            const frontendApi = atob(clerkPubKey.split('_')[2]).replace('$', '');
            script.src = 'https://' + frontendApi + '/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
            script.crossOrigin = 'anonymous';
            script.addEventListener('load', async function () {
              await window.Clerk.load();
              const userBtnEl = document.getElementById('user-button');
              if (window.Clerk.user) {
                const u = window.Clerk.user;
                const name = u.fullName || u.username || '';
                const email = u.primaryEmailAddress ? u.primaryEmailAddress.emailAddress : '';
                userBtnEl.title = name + (name && email ? ' - ' : '') + email;
                window.Clerk.mountUserButton(userBtnEl);
              } else {
                userBtnEl.innerHTML = '<button onclick="window.Clerk.openSignIn()" style="background:var(--accent-blue);color:#fff;border:none;padding:0.4rem 1rem;border-radius:6px;cursor:pointer;">登入</button>';
              }
            });
            document.body.appendChild(script);
          `}} />
        )}
      </body>
    </html>
  );
}
