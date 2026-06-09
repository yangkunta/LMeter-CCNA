
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
             li.style.textDecoration = 'underline';
             li.onclick = () => sendMessage(cleanText);
          }
        });
      }
    }
  });
}
