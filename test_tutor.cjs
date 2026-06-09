const fs = require('fs');
const { JSDOM } = require('jsdom');
const code = fs.readFileSync('src/pages/tutor.tsx', 'utf8');

const htmlStr = code.substring(code.indexOf('<html'), code.lastIndexOf('</html>') + 7);

const dom = new JSDOM(htmlStr, { runScripts: 'dangerously' });
const window = dom.window;

// Stub out marked and hljs if they are missing
if (!window.marked) {
  window.marked = { setOptions: () => {}, parse: (text) => text };
}
if (!window.hljs) {
  window.hljs = { highlightElement: () => {} };
}

window.document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded fired!");
  try {
    const qList = window.document.getElementById('quickList');
    console.log("quickList length:", qList ? qList.innerHTML.length : 'NULL');
    if (qList && qList.innerHTML.length > 0) {
      console.log("SUCCESS");
    } else {
      console.log("FAIL: Empty quickList");
    }
  } catch (err) {
    console.error("Error in DOMContentLoaded:", err);
  }
});

// Since JSDOM load events happen asynchronously
setTimeout(() => {
  console.log("Timeout ended.");
}, 1000);
