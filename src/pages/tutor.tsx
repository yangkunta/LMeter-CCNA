// ─── AI 導師對話頁面 v3 ─── 串流輸出 + 回覆模式切換 ─────────────

export function renderTutor(clerkKey: string) {
  const html = `<!DOCTYPE html>
<html lang="zh-TW" data-theme="system">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AI 導師 — LearnMentorCCNA</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Noto+Sans+TC:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css" id="hljs-dark"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css" id="hljs-light" disabled/>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/core.min.js"></script>
  <style>\n    .spoiler { color: transparent; background-color: var(--text-color); border-radius: 4px; padding: 0 4px; transition: color 0.2s; }\n    .spoiler:hover, .spoiler::selection { color: var(--bg-color); }
    :root,[data-theme="dark"]{
      --bg:#16161e;--bg2:#1e1e2a;--bg3:#252535;
      --surface:rgba(255,255,255,0.05);--surface2:rgba(255,255,255,0.09);
      --border:rgba(255,255,255,0.09);
      --text:#dcd8cc;--text2:#9b96a8;--text3:#5a566a;
      --accent:#8b9cf4;--accent2:#5ec4d4;--green:#5dbf85;
      --bubble-ai:#1e1e2a;--bubble-user:rgba(139,156,244,0.12);
      --bubble-ai-b:rgba(255,255,255,0.08);--bubble-user-b:rgba(139,156,244,0.25);
      --code-bg:#0d0d14;--nav-bg:rgba(22,22,30,0.92);
      --sidebar-bg:#1a1a25;--input-bg:#1e1e2a;
      --shadow:0 2px 12px rgba(0,0,0,0.4);
    }
    [data-theme="light"]{
      --bg:#f7f4ef;--bg2:#efecea;--bg3:#e8e4e0;
      --surface:rgba(0,0,0,0.03);--surface2:rgba(0,0,0,0.06);
      --border:rgba(0,0,0,0.09);
      --text:#2c2a35;--text2:#6b6880;--text3:#a8a4b8;
      --accent:#5c6fc2;--accent2:#0e8c9e;--green:#2d8f5e;
      --bubble-ai:#ffffff;--bubble-user:rgba(92,111,194,0.08);
      --bubble-ai-b:rgba(0,0,0,0.08);--bubble-user-b:rgba(92,111,194,0.2);
      --code-bg:#f0ece8;--nav-bg:rgba(247,244,239,0.95);
      --sidebar-bg:#eeebe6;--input-bg:#ffffff;
      --shadow:0 2px 12px rgba(0,0,0,0.10);
    }
    *{margin:0;padding:0;box-sizing:border-box;}
    /* 字體大小：預設小（與導覽列一致），大模式由使用者切換 */
    :root { --chat-font: 0.82rem; }
    [data-font="large"] { --chat-font: 0.92rem; }
    body{font-family:'Inter','Noto Sans TC',system-ui,sans-serif;background:var(--bg);color:var(--text);height:100dvh;display:flex;flex-direction:column;overflow:hidden;font-size:15px;line-height:1.65;transition:background .25s,color .25s;}

    /* Nav */
    .nav{display:flex;align-items:center;justify-content:space-between;padding:.6rem 1.2rem;background:var(--nav-bg);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);flex-shrink:0;z-index:20;gap:.5rem;}
    .nav-brand{font-weight:700;font-size:1rem;color:var(--accent);text-decoration:none;white-space:nowrap;}
    .nav-links{display:flex;gap:1rem;flex:1;justify-content:center;}
    .nav-links a{color:var(--text2);font-size:.82rem;font-weight:500;text-decoration:none;transition:color .15s;white-space:nowrap;}
    .nav-links a:hover,.nav-links a.active{color:var(--accent);}
    .nav-right{display:flex;align-items:center;gap:.5rem;}
    .theme-switcher{display:flex;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:2px;}
    .theme-btn{width:28px;height:26px;border:none;border-radius:6px;background:transparent;cursor:pointer;font-size:.85rem;color:var(--text2);transition:all .15s;display:flex;align-items:center;justify-content:center;}
    .theme-btn.active{background:var(--accent);color:#fff;}
    .theme-btn:hover:not(.active){background:var(--surface2);color:var(--text);}

    /* Layout */
    .layout{display:flex;flex:1;overflow:hidden;}

    /* Sidebar */
    .sidebar{width:220px;flex-shrink:0;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;transition:background .25s;}
    .sidebar.right-sidebar{border-right:none;border-left:1px solid var(--border);display:none;}
    .sidebar.right-sidebar.show{display:flex;}
    .sidebar-title{padding:.8rem 1rem .3rem;font-size:.7rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;}
    .quick-list{flex:1;overflow-y:auto;padding:.3rem .6rem 1rem;}
    .quick-list::-webkit-scrollbar{width:3px;}
    .quick-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
    .domain-tag{display:block;padding:.2rem .4rem;margin:.6rem 0 .2rem;font-size:.68rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
    .quick-btn{display:block;width:100%;text-align:left;padding:.45rem .6rem;background:transparent;border:none;color:var(--text2);font-size:.8rem;border-radius:6px;cursor:pointer;transition:all .12s;line-height:1.4;font-family:inherit;}
    .quick-btn:hover{background:var(--surface2);color:var(--text);}
    .sidebar-footer{padding:.7rem 1rem;border-top:1px solid var(--border);font-size:.72rem;color:var(--text3);display:flex;align-items:center;gap:.4rem;}
    .dot-live{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;box-shadow:0 0 6px var(--green);}

    /* Chat area */
    .chat-area{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}
    .messages{flex:1;overflow-y:auto;padding:1.2rem 1rem .5rem;display:flex;flex-direction:column;gap:.9rem;scroll-behavior:smooth;}
    .messages::-webkit-scrollbar{width:5px;}
    .messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
    .scroll-to-bottom{position:absolute;bottom:96px;right:16px;width:34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:1rem;display:none;align-items:center;justify-content:center;box-shadow:var(--shadow);z-index:10;transition:opacity .2s,transform .2s;}
    .scroll-to-bottom.show{display:flex;}
    .scroll-to-bottom:hover{transform:scale(1.1);}
    .chat-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;}

    /* Messages */
    .msg{display:flex;gap:.6rem;max-width:800px;margin:0 auto;width:100%;}
    .msg.user{flex-direction:row-reverse;}
    .avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;margin-top:2px;}
    .avatar.ai{background:linear-gradient(135deg,#5c6fc2,#7c5cbf);color:#fff;}
    .avatar.user-av{background:linear-gradient(135deg,#e07c5a,#c4536e);color:#fff;}
    .bubble{padding:.75rem 1rem;border-radius:14px;max-width:calc(100% - 44px);font-size:var(--chat-font);line-height:1.72;}
    .bubble.ai{background:var(--bubble-ai);border:1px solid var(--bubble-ai-b);border-top-left-radius:4px;box-shadow:var(--shadow);}
    .bubble.user{background:var(--bubble-user);border:1px solid var(--bubble-user-b);border-top-right-radius:4px;color:var(--text);}
    .bubble.ai h1,.bubble.ai h2,.bubble.ai h3{margin:.9rem 0 .4rem;color:var(--accent);font-weight:600;}
    .bubble.ai h1{font-size:1.05rem;}.bubble.ai h2{font-size:.98rem;}.bubble.ai h3{font-size:.92rem;}
    .bubble.ai p{margin:.4rem 0;}
    .bubble.ai ul,.bubble.ai ol{padding-left:1.4rem;margin:.4rem 0;}
    .bubble.ai li{margin:.2rem 0;}
    .bubble.ai code{font-family:'JetBrains Mono',monospace;background:var(--surface2);border:1px solid var(--border);padding:.1em .4em;border-radius:4px;font-size:.82em;color:var(--accent2);}
    .bubble.ai pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:.8rem 1rem;margin:.6rem 0;overflow-x:auto;}
    .bubble.ai pre code{background:none;border:none;padding:0;font-size:.82rem;color:var(--text);}
    .bubble.ai strong{color:var(--accent);font-weight:600;}
    .bubble.ai em{color:var(--accent2);font-style:italic;}
    .bubble.ai table{width:100%;border-collapse:collapse;margin:.6rem 0;font-size:.85rem;border:1px solid var(--border);}
    .bubble.ai th{background:var(--surface2);padding:.4rem .7rem;text-align:left;border:1px solid var(--border);font-weight:600;color:var(--accent);}
    .bubble.ai td{padding:.4rem .7rem;border:1px solid var(--border);}
    .bubble.ai tr:nth-child(even) td{background:var(--surface);}
    .bubble.ai blockquote{border-left:3px solid var(--accent);padding:.4rem .8rem;margin:.5rem 0;background:var(--surface);color:var(--text2);border-radius:0 8px 8px 0;}
    .bubble.ai hr{border:none;border-top:1px solid var(--border);margin:.8rem 0;}
    /* 串流游標 */
    .cursor{display:inline-block;width:2px;height:1em;background:var(--accent);margin-left:2px;animation:blink .7s step-end infinite;vertical-align:text-bottom;}
    @keyframes blink{50%{opacity:0;}}
    /* 打字動畫 */
    .typing{display:flex;align-items:center;gap:5px;padding:.4rem 0;}
    .typing span{width:7px;height:7px;border-radius:50%;background:var(--accent);opacity:.5;animation:bounce 1.2s ease infinite;}
    .typing span:nth-child(2){animation-delay:.2s;}
    .typing span:nth-child(3){animation-delay:.4s;}
    @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4;}40%{transform:translateY(-5px);opacity:1;}}

    /* Input area */
    .input-area{padding:.7rem 1rem .9rem;border-top:1px solid var(--border);background:var(--bg2);flex-shrink:0;}
    .input-wrap{max-width:800px;margin:0 auto;display:flex;gap:.5rem;align-items:flex-end;}
    .input-box{flex:1;background:var(--input-bg);border:1.5px solid var(--border);border-radius:12px;padding:.65rem .9rem;color:var(--text);font-size:var(--chat-font);font-family:inherit;resize:none;min-height:42px;max-height:140px;transition:border-color .2s,background .2s;line-height:1.5;outline:none;}
    .input-box:focus{border-color:var(--accent);}
    .input-box::placeholder{color:var(--text3);}
    .send-btn{width:42px;height:42px;border-radius:12px;background:var(--accent);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1rem;flex-shrink:0;transition:opacity .2s,transform .1s;}
    .send-btn:hover{opacity:.85;}
    .send-btn:active{transform:scale(.94);}
    .send-btn:disabled{opacity:.35;cursor:not-allowed;}

    /* 輸入列下方控制列 */
    .input-controls{max-width:800px;margin:.35rem auto 0;display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:0 2px;}

    /* 回覆模式切換 */
    .mode-switcher{display:flex;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:2px;}
    .mode-btn{padding:.22rem .7rem;border:none;border-radius:6px;background:transparent;cursor:pointer;font-size:.75rem;font-weight:500;color:var(--text2);transition:all .15s;font-family:inherit;white-space:nowrap;}
    .mode-btn.active{background:var(--accent);color:#fff;}
    .mode-btn:hover:not(.active){background:var(--surface2);color:var(--text);}
    .mode-hint{font-size:.7rem;color:var(--text3);}

    /* Welcome */
    .welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;gap:.5rem;}
    .welcome-icon{font-size:3rem;}
    .welcome h2{font-size:1.5rem;font-weight:700;color:var(--accent);}
    .welcome p{color:var(--text2);font-size:.9rem;max-width:380px;line-height:1.6;}
    .welcome-chips{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:1rem;max-width:500px;}
    .chip{padding:.4rem .9rem;background:var(--surface2);border:1px solid var(--border);border-radius:2rem;font-size:.8rem;color:var(--text2);cursor:pointer;transition:all .15s;font-family:inherit;}
    .chip:hover{border-color:var(--accent);color:var(--accent);}

    @media(max-width:700px){.sidebar{display:none;}.nav-links{display:none;}}
  </style>
</head>
<body>
<nav class="nav">
  <a href="/" class="nav-brand">🎓 LearnMentorCCNA</a>
  <div class="nav-links">
    <a href="/portal">Portal</a>
    <a href="#" onclick="alert('還在規畫中'); return false;">刷題</a>
    <a href="#" onclick="alert('還在規畫中'); return false;">模擬考</a>
    <a href="/tutor" class="active">AI 導師</a>
    <a href="#" onclick="alert('還在規畫中'); return false;">儀表板</a>
  </div>
  <div class="nav-right">
    <div id="user-button"></div>
    <!-- 字體大小切換 -->
    <div class="theme-switcher" title="字體大小">
      <button class="theme-btn active" id="fontSmall" onclick="setFont('small')" title="小（預設）">A</button>
      <button class="theme-btn" id="fontLarge" onclick="setFont('large')" title="大">A+</button>
    </div>
    <!-- 配色切換 -->
    <div class="theme-switcher" title="配色模式">
      <button class="theme-btn" id="btnLight" onclick="setTheme('light')" title="日間">☀️</button>
      <button class="theme-btn active" id="btnSystem" onclick="setTheme('system')" title="跟隨系統">💻</button>
      <button class="theme-btn" id="btnDark" onclick="setTheme('dark')" title="夜間">🌙</button>
    </div>
  </div>
</nav>

<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-title">快速提問</div>
    <div class="quick-list" id="quickList"></div>
    <div class="sidebar-footer">
      <span class="dot-live"></span><span id="modelName">Gemini 3.1 Pro Preview</span> · 串流輸出
    </div>
  </aside>

  <div class="chat-wrap">
    <div class="chat-area">
      <div class="messages" id="messages">
        <div class="welcome" id="welcome">
          <div class="welcome-icon">🤖</div>
          <h2>NetMentor</h2>
          <p>CCNA 200-301 專屬 AI 導師<br/>用中文解答任何網路問題</p>
          <div class="welcome-chips" id="chips"></div>
        </div>
      </div>
    </div>

    <button class="scroll-to-bottom" id="scrollBtn" title="跳回最新訊息" onclick="scrollToBottom(true)">↓</button>

    <div class="input-area">
      <div class="input-wrap">
        <textarea id="inputBox" class="input-box" rows="1"
          placeholder="問我任何 CCNA 問題，例如：什麼是 OSPF？子網路怎麼算？"></textarea>
        <button class="send-btn" id="sendBtn" title="送出 (Enter)">➤</button>
      </div>
      <!-- 控制列：回覆模式 + 提示 -->
      <div class="input-controls">
        <div class="mode-switcher" title="回覆模式">
          <button class="mode-btn active" id="modeStd" onclick="setMode('standard')">標準</button>
          <button class="mode-btn" id="modeFull" onclick="setMode('full')">完整</button>
        </div>
        <span class="mode-hint" id="modeHint">精簡快速回答</span>
        <span style="flex:1"></span>
        <span class="mode-hint" id="charCount"></span>
      </div>
    </div>
  </div>

  <aside class="sidebar right-sidebar" id="rightSidebar">
    <div class="sidebar-title">延伸推薦主題</div>
    <div class="quick-list" id="recommendList">
      <!-- 動態填入 -->
    </div>
  </aside>
</div>

<script>\n
// ═══════════════════════════════════════════
// 錯誤捕捉 (Debug用)
// ═══════════════════════════════════════════
window.addEventListener('error', function(e) {
  const ql = document.getElementById('quickList');
  if (ql) ql.innerHTML = '<div style="color:red;padding:10px;">Error: ' + e.message + '</div>';
});

// ═══════════════════════════════════════════
// 主題管理
// ═══════════════════════════════════════════
const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(mode) {
  let actual = mode === 'system' ? (sysDark.matches ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', actual);
  document.getElementById('hljs-dark').disabled  = actual === 'light';
  document.getElementById('hljs-light').disabled = actual === 'dark';
}
function setTheme(mode) {
  localStorage.setItem('theme', mode);
  applyTheme(mode);
  ['Light','System','Dark'].forEach(t =>
    document.getElementById('btn'+t).classList.toggle('active', t.toLowerCase() === mode));
}
sysDark.addEventListener('change', () => {
  if ((localStorage.getItem('theme')||'system') === 'system') applyTheme('system');
});
setTheme(localStorage.getItem('theme') || 'system');

// ═══════════════════════════════════════════
// 字體大小
// ═══════════════════════════════════════════
function setFont(size) {
  localStorage.setItem('fontSize', size);
  document.documentElement.setAttribute('data-font', size === 'large' ? 'large' : '');
  document.getElementById('fontSmall').classList.toggle('active', size !== 'large');
  document.getElementById('fontLarge').classList.toggle('active', size === 'large');
}
setFont(localStorage.getItem('fontSize') || 'small');

// ═══════════════════════════════════════════
// 回覆模式
// ═══════════════════════════════════════════
let currentMode = localStorage.getItem('replyMode') || 'full'; // 預設完整模式
const MODE_HINTS = {
  standard: '精簡快速回答（較省 token）',
  full: '深度教學 + 蘇格拉底引導 + 延伸問題',
};
function setMode(mode) {
  currentMode = mode;
  localStorage.setItem('replyMode', mode);
  document.getElementById('modeStd').classList.toggle('active', mode === 'standard');
  document.getElementById('modeFull').classList.toggle('active', mode === 'full');
  document.getElementById('modeHint').textContent = MODE_HINTS[mode];
  
  // 更新左下角顯示的模型名稱
  const modelEl = document.getElementById('modelName');
  if (modelEl) {
    modelEl.textContent = mode === 'full' ? 'Gemini 3.1 Pro Preview' : 'Gemini 3.5 Flash';
  }
}
setMode(currentMode);

// ═══════════════════════════════════════════
// 快速提問
// ═══════════════════════════════════════════
const QUICK_QUESTIONS = [
  { domain:'Network Fundamentals', items:['OSI 七層模型各層功能？','TCP 和 UDP 的差異？','子網路切割 /28 怎麼算？']},
  { domain:'IP Connectivity', items:['Static vs Dynamic routing？','OSPF DR/BDR 選舉規則？','Administrative Distance 常見值？']},
  { domain:'Network Access', items:['Trunk 和 Access port 差別？','STP Root Bridge 怎麼選？','LACP 和 PAgP 差異？']},
  { domain:'Security', items:['Standard vs Extended ACL？','DHCP Snooping 是什麼？','NAT/PAT 運作原理？']},
  { domain:'Automation', items:['SDN 和傳統架構差別？','REST API 各方法用途？']},
];
const CHIPS = ['什麼是 OSPF？','VLAN 怎麼設定？','子網路切割教學','ACL 怎麼寫？','STP Root Bridge','NAT/PAT 原理'];

async function initSidebarAndChips() {
  let priorities = [];
  try {
    const res = await fetch('/api/progress/mastery');
    if (res.ok) {
      const data = await res.json();
      if (data.mastery && data.mastery.length > 0) {
         const ranked = data.mastery.map(d => ({
           domain: d.domain,
           rate: d.total > 0 ? d.correct / d.total : 0,
           total: d.total
         })).sort((a,b) => {
           if (a.total === 0 && b.total > 0) return -1;
           if (b.total === 0 && a.total > 0) return 1;
           return a.rate - b.rate;
         });
         priorities = ranked.map(r => r.domain);
      }
    }
  } catch(e) {}

  let qList = [...QUICK_QUESTIONS];
  if (priorities.length > 0) {
    qList.sort((a,b) => {
       let ia = priorities.indexOf(a.domain);
       let ib = priorities.indexOf(b.domain);
       if(ia === -1) ia = 999;
       if(ib === -1) ib = 999;
       return ia - ib;
    });
  } else {
    qList.sort(() => Math.random() - 0.5);
  }

  const list = document.getElementById('quickList');
  if(list) list.innerHTML = '';
  qList.slice(0, 4).forEach(({ domain, items }) => {
    const tag = document.createElement('div');
    tag.className = 'domain-tag'; tag.textContent = domain;
    list.appendChild(tag);
    
    const shuffledItems = [...items].sort(() => Math.random() - 0.5).slice(0, 2);
    shuffledItems.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'quick-btn'; btn.textContent = q;
      btn.onclick = () => sendMessage(q);
      list.appendChild(btn);
    });
  });

  const c = document.getElementById('chips');
  if(c) c.innerHTML = '';
  const chipItems = [];
  qList.slice(0, 3).forEach(d => {
    if(d.items.length > 0) chipItems.push(d.items[Math.floor(Math.random() * d.items.length)]);
  });
  chipItems.push('幫我做個隨堂測驗！');
  chipItems.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'chip'; btn.textContent = q;
    btn.onclick = () => sendMessage(q);
    c.appendChild(btn);
  });

  // Build Right Sidebar (Learning Progress & Keywords)
  const rl = document.getElementById('recommendList');
  if (rl) {
    rl.innerHTML = '';
    document.getElementById('rightSidebar').classList.add('show');
    // Always show the top 6 domains in the right sidebar
    const allDomains = [...QUICK_QUESTIONS];
    // Sort them so prioritized domains are at top
    if (priorities.length > 0) {
      allDomains.sort((a,b) => {
         let ia = priorities.indexOf(a.domain);
         let ib = priorities.indexOf(b.domain);
         if(ia === -1) ia = 999;
         if(ib === -1) ib = 999;
         return ia - ib;
      });
    }

    allDomains.forEach(({ domain, items }) => {
      const section = document.createElement('div');
      section.style.marginBottom = '1.2rem';
      
      const header = document.createElement('div');
      header.style.display = 'flex'; header.style.justifyContent = 'space-between'; header.style.alignItems = 'center'; header.style.marginBottom = '0.5rem';
      const title = document.createElement('div');
      title.className = 'domain-tag'; title.style.margin = '0'; title.textContent = domain;
      header.appendChild(title);
      
      // Find mastery if window.masteryData exists (we'll save it earlier)
      if (window.masteryData) {
        const md = window.masteryData.find(d => d.domain === domain);
        if (md && md.total > 0) {
          const pct = Math.round((md.correct / md.total) * 100);
          const stat = document.createElement('div');
          stat.style.fontSize = '0.75rem'; stat.style.color = pct >= 80 ? 'var(--green)' : (pct >= 50 ? 'var(--yellow)' : 'var(--accent2)');
          stat.textContent = '答對率 ' + pct + '% (' + md.correct + '/' + md.total + ')';
          header.appendChild(stat);
        }
      }
      section.appendChild(header);
      
      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex'; btnContainer.style.flexDirection = 'column'; btnContainer.style.gap = '0.4rem';
      
      // Add all items as buttons (up to 10)
      items.slice(0, 10).forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'quick-btn'; btn.textContent = q; btn.style.textAlign = 'left'; btn.style.whiteSpace = 'normal';
        btn.onclick = () => sendMessage(q);
        btnContainer.appendChild(btn);
      });
      section.appendChild(btnContainer);
      rl.appendChild(section);
    });
  }
}

// ═══════════════════════════════════════════
// 捲動
// ═══════════════════════════════════════════
const msgBox = document.getElementById('messages');
const scrollBtn = document.getElementById('scrollBtn');
let userScrolledUp = false;
msgBox.addEventListener('scroll', () => {
  const atBottom = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight < 80;
  userScrolledUp = !atBottom;
  scrollBtn.classList.toggle('show', userScrolledUp);
});
function scrollToBottom(force = false) {
  if (force || !userScrolledUp) {
    msgBox.scrollTop = msgBox.scrollHeight;
    userScrolledUp = false;
    scrollBtn.classList.remove('show');
  }
}

// ═══════════════════════════════════════════
// 對話
// ═══════════════════════════════════════════
let messages = [];
let isLoading = false;
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

function hideWelcome() {
  const w = document.getElementById('welcome');
  if (w) w.remove();
}

function createBubble(role, text, isCache = false) {
  const msg = document.createElement('div');
  msg.className = 'msg' + (role === 'user' ? ' user' : '');
  const av = document.createElement('div');
  av.className = 'avatar ' + (role === 'user' ? 'user-av' : 'ai');
  av.textContent = role === 'user' ? '你' : '🤖';
  if (isCache && role === 'ai') {
    const cacheLabel = document.createElement('span');
    cacheLabel.style.fontSize = '0.7rem';
    cacheLabel.style.color = 'var(--green)';
    cacheLabel.style.marginLeft = '8px';
    cacheLabel.style.whiteSpace = 'nowrap';
    cacheLabel.textContent = '⚡ 快取載入';
    av.appendChild(cacheLabel);
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (role === 'user' ? 'user' : 'ai');
  if (role === 'user') {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = marked.parse(text || '');
  }
  msg.appendChild(av);
  msg.appendChild(bubble);
  msgBox.appendChild(msg);
  scrollToBottom();
  return { msg, bubble };
}

function showTyping() {
  const msg = document.createElement('div');
  msg.className = 'msg'; msg.id = 'typing-msg';
  const av = document.createElement('div');
  av.className = 'avatar ai'; av.textContent = '🤖';
  const t = document.createElement('div');
  t.className = 'typing';
  t.innerHTML = '<span></span><span></span><span></span>';
  msg.appendChild(av); msg.appendChild(t);
  msgBox.appendChild(msg);
  scrollToBottom();
}
function removeTyping() {
  const t = document.getElementById('typing-msg');
  if (t) t.remove();
}

// ─── 串流對話（主要模式）───────────────────
async function sendMessage(text) {
  if (isLoading || !text?.trim()) return;
  hideWelcome();
  const userText = text.trim();
  document.getElementById('inputBox').value = '';
  autoResize();

  const { msg: userMsg } = createBubble('user', userText);
  // 只把模式與當前這句組成 cacheKey
  const cacheKey = currentMode + ':' + userText;
  messages.push({ role: 'user', content: userText });

  isLoading = true;
  document.getElementById('sendBtn').disabled = true;
  showTyping();

  // 快取機制：先檢查是否問過一模一樣的對話脈絡
  const cachedData = localStorage.getItem('qaCache');
  let qaCache = {};
  try { qaCache = cachedData ? JSON.parse(cachedData) : {}; } catch(e){}
  
  if (qaCache[cacheKey]) {
    removeTyping();
    const fullText = qaCache[cacheKey];
    const { bubble } = createBubble('ai', fullText, true);
    bubble.querySelectorAll('pre code').forEach(b => {
      if (window.hljs) hljs.highlightElement(b);
    });
    
    requestAnimationFrame(() => {
      const containerTop = msgBox.getBoundingClientRect().top;
      const msgTop = userMsg.getBoundingClientRect().top;
      const targetScroll = msgBox.scrollTop + (msgTop - containerTop) - 12;
      msgBox.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    });

    makeListClickable(bubble);
    messages.push({ role: 'assistant', content: fullText });
    isLoading = false;
    document.getElementById('sendBtn').disabled = false;
    return;
  }

  try {
    const res = await fetch('/api/tutor/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, mode: currentMode }),
    });

    removeTyping();

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      createBubble('ai', '❌ **錯誤**：' + (err.detail || err.error || res.status));
      isLoading = false;
      document.getElementById('sendBtn').disabled = false;
      return;
    }

    // 建立串流氣泡
    const { bubble } = createBubble('ai', '');
    // 加游標
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    bubble.appendChild(cursor);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const json = JSON.parse(data);
          if (json.token) {
            fullText += json.token;
            bubble.innerHTML = marked.parse(fullText);
            bubble.appendChild(cursor);
            // 串流中：只在使用者沒有手動捲上去時才跟著往下捲
            if (!userScrolledUp) {
              msgBox.scrollTop = msgBox.scrollHeight;
            }
          }
        } catch { /* skip */ }
      }
    }

    // 移除游標，最終渲染
    cursor.remove();
    bubble.innerHTML = marked.parse(fullText);
    bubble.querySelectorAll('pre code').forEach(b => {
      if (window.hljs) hljs.highlightElement(b);
    });

    // ✅ 回到使用者提問的位置（讓問題和答案開頭都在視野內）
    requestAnimationFrame(() => {
      const containerTop = msgBox.getBoundingClientRect().top;
      const msgTop = userMsg.getBoundingClientRect().top;
      const targetScroll = msgBox.scrollTop + (msgTop - containerTop) - 12;
      msgBox.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      userScrolledUp = true;
      scrollBtn.classList.add('show');
    });

    // 存入快取 (最多保留 50 筆)
    qaCache[cacheKey] = fullText;
    const keys = Object.keys(qaCache);
    if (keys.length > 50) delete qaCache[keys[0]];
    try { localStorage.setItem('qaCache', JSON.stringify(qaCache)); } catch(e){}

    makeListClickable(bubble);

    messages.push({ role: 'assistant', content: fullText });
    if (messages.length > 40) messages = messages.slice(-30);

  } catch (e) {
    removeTyping();
    createBubble('ai', '❌ **連線錯誤**，請稍後重試。');
  } finally {
    isLoading = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('inputBox').focus();
  }
}

function autoResize() {
  const box = document.getElementById('inputBox');
  box.style.height = 'auto';
  box.style.height = Math.min(box.scrollHeight, 140) + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebarAndChips();
  const inputBox = document.getElementById('inputBox');
  inputBox.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputBox.value); }
  });
  inputBox.addEventListener('input', () => {
    autoResize();
    const len = inputBox.value.length;
    document.getElementById('charCount').textContent = len > 0 ? len + ' 字' : '';
  });
  document.getElementById('sendBtn').addEventListener('click', () => sendMessage(inputBox.value));
  inputBox.focus();
});

// 提取延伸探索推薦主題 (改由 DOM 解析)
function makeListClickable(bubble) {
  const headers = bubble.querySelectorAll('h3');
  headers.forEach(h => {
    if (h.textContent.includes('延伸探索') || h.textContent.includes('隨堂測驗')) {
      let next = h.nextElementSibling;
      while(next && next.tagName !== 'UL' && next.tagName !== 'OL' && next.tagName !== 'H3') {
        next = next.nextElementSibling;
      }
      if (next && (next.tagName === 'UL' || next.tagName === 'OL')) {
        next.querySelectorAll('li').forEach(li => {
          // 清理多餘的 formatting
          const cleanText = li.textContent.replace(/\\*\\*/g, '').trim();
          
          // 若為隨堂測驗，點擊後自動填入 input
          if (h.textContent.includes('隨堂測驗')) {
             li.style.cursor = 'pointer';
             li.title = '點擊代入輸入框';
             li.onmouseover = () => li.style.color = 'var(--accent)';
             li.onmouseout = () => li.style.color = '';
             li.onclick = () => {
               document.getElementById('inputBox').value = '關於隨堂測驗的 ' + cleanText + '，我的答案是：';
               document.getElementById('inputBox').focus();
               autoResize();
             };
          } else {
             // 延伸探索，點擊後直接送出
             li.style.cursor = 'pointer';
             li.style.color = 'var(--accent)';
             li.style.textDecoration = 'underline';
             li.onclick = () => sendMessage(cleanText);
          }
        });
      }
    }
  });
}

</script>
${clerkKey ? `
  <script>
    const clerkPubKey = '${clerkKey}';
    const frontendApi = atob(clerkPubKey.split('_')[2]).replace('$', '');
    const scriptUrl = 'https://' + frontendApi + '/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
    const s = document.createElement('script');
    s.setAttribute('data-clerk-publishable-key', clerkPubKey);
    s.async = true;
    s.src = scriptUrl;
    s.crossOrigin = 'anonymous';
    s.addEventListener('load', async function () {
      await window.Clerk.load();
      const userBtnEl = document.getElementById('user-button');
      if (window.Clerk.user) {
        const u = window.Clerk.user;
        const name = u.fullName || u.username || '';
        const email = u.primaryEmailAddress ? u.primaryEmailAddress.emailAddress : '';
        userBtnEl.title = name + (name && email ? ' - ' : '') + email;
        window.Clerk.mountUserButton(userBtnEl);
      } else {
        userBtnEl.innerHTML = '<button onclick="window.Clerk.openSignIn()" style="background:var(--accent);color:#fff;border:none;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;">登入</button>';
      }
    });
    document.body.appendChild(s);
  </script>` : ''}
</body>
</html>`;
  return html;
}
