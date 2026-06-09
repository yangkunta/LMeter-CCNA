// ─── AI LLM 統一介面 ────────────────────────────────────
// 支援：Gemini 2.5 Flash/Pro、Azure OpenAI、公司內網 Gemma
// 所有 AI 呼叫統一走此模組，切換 Provider 只需改一處

import type { Bindings, AIProvider, AIMessage, AIResponse } from "../types";

// ─── CCNA 專家 System Prompt ──────────────────────────────────────

// ─── 完整模式：深度教學，含蘇格拉底引導、延伸問題 ──────────────────
const CCNA_SYSTEM_PROMPT_FULL = `你是一位專業的 CCNA 200-301 認證教學專家，名叫「NetMentor」。

你的專業涵蓋 CCNA 200-301 v1.1 考試的所有六大領域：
1. Network Fundamentals (20%)
2. Network Access (20%)
3. IP Connectivity (25%)
4. IP Services (10%)
5. Security Fundamentals (15%)
6. Automation and Programmability (10%)

教學原則（嚴格遵守）：
- **嚴格限制範圍**：你的回答僅限於 CCNA 認證相關領域的問題。若使用者的提問超出了這個範圍，請一律直接回覆這句話（不加任何其他字）：「我是CCNA認證教學大師，你的提問不在我能回覆的範圍。」
- 用繁體中文回答，但**所有網路專有名詞必須以中英對照格式呈現**，例如 \`Routing Table (路由表)\`、\`Subnet Mask (子網路遮罩)\`。
- 在解說觀念時，必須挑出 1~3 個 CCNA 考試中與該主題相關的「常見英文動詞或關鍵字」（例如 verify, configure, forward, drop 等）進行單字教學。
- 先確認學員的基礎，再決定解說深度。使用類比和實際案例讓抽象概念具體化。
- 遇到計算題（如子網切割），展示完整計算步驟。

格式要求（嚴格遵守）：
1. 回答的第一行必須是所屬的 CCNA 領域，格式為：\`🏷️ **領域**：[領域名稱]\`
2. 使用 markdown 格式，重要術語用 **粗體** 標示，指令用 \`code\` 標示。
3. 若系統有提供【隨堂測驗考題庫】，請在回答尾聲加上 \`### 📝 隨堂測驗\` 標題，列出題庫中的 1 題英文原題與選項，讓學員挑戰。提供解答時，**必須**使用此格式隱藏答案：\`<span class="spoiler">解答：[你的解答與解釋]</span>\`。絕不可直接印出明文解答。
4. 回答最後，必須有一個 \`### 🔗 延伸探索\` 的標題，並用條列式（- ）列出 2 到 3 個與此問題高度相關、適合學員接著學習的 CCNA 關鍵字/主題。`;

// ─── 標準模式：簡潔直接，快速解答 ────────────────────────────────
const CCNA_SYSTEM_PROMPT_SHORT = `你是 CCNA 200-301 教學助手「NetMentor」。
用繁體中文，簡潔直接地回答問題。

教學原則：
- **嚴格限制範圍**：你的回答僅限於 CCNA 認證相關領域的問題。若使用者的提問超出了這個範圍，請一律直接回覆這句話（不加任何其他字）：「我是CCNA認證教學大師，你的提問不在我能回覆的範圍。」
- **所有網路專有名詞必須以中英對照格式呈現**，例如 \`Routing Table (路由表)\`。
- 視情況補充 1~2 個相關的 CCNA 考試必備英文動詞/關鍵字（如 verify, configure）。

格式要求（嚴格遵守）：
1. 回答的第一行必須是所屬的 CCNA 領域，格式為：\`🏷️ **領域**：[領域名稱]\`
2. 若系統有提供【隨堂測驗考題庫】，請在結尾加上 \`### 📝 隨堂測驗\` 標題，列出 1 題原文題目考學員。解答必須隱藏：\`<span class="spoiler">解答：[內容]</span>\`。
3. 回答最後，必須有一個 \`### 🔗 延伸探索\` 的標題，並用條列式（- ）列出 2 到 3 個高度相關的 CCNA 關鍵字。`;

// 預設用完整模式（向後相容）
const CCNA_SYSTEM_PROMPT = CCNA_SYSTEM_PROMPT_FULL;

// ─── Gemini API ───────────────────────────────────────────────────

async function callGemini(
  env: Bindings,
  messages: AIMessage[],
  model: "gemini-3.5-flash" | "gemini-3.1-pro-preview" = "gemini-3.5-flash"
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Convert messages to Gemini format
  const systemInstruction = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemInstruction
        ? { parts: [{ text: systemInstruction }] }
        : undefined,
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as any;
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "（AI 無回應，請重試）"
  );
}

// ─── Gemini 串流 API ──────────────────────────────────────────────

export async function getGeminiEmbedding(env: Bindings, text: string): Promise<number[]> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-2",
      outputDimensionality: 768,
      content: { parts: [{ text }] }
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Embedding error: ${err}`);
    return []; // Return empty array on failure
  }

  const data = await res.json() as any;
  return data?.embedding?.values || [];
}

export async function streamGemini(
  env: Bindings,
  messages: AIMessage[],
  model: "gemini-3.5-flash" | "gemini-3.1-pro-preview" = "gemini-3.5-flash"
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const systemInstruction = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
      },
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    throw new Error(`Gemini stream error ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          try {
            const json = JSON.parse(dataStr);
            const token = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (token) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ token })}\n\n`)
              );
            }
          } catch { /* ignore parse error for incomplete JSON */ }
        }
      }
    },
    cancel() { reader.cancel(); }
  });
}

// ─── Azure OpenAI API ─────────────────────────────────────────────

async function callAzureOpenAI(
  env: Bindings,
  messages: AIMessage[]
): Promise<string> {
  const apiKey = env.AZURE_OPENAI_API_KEY;
  const baseUrl = env.AZURE_OPENAI_BASE_URL;
  const model = env.AZURE_OPENAI_MODEL;

  if (!apiKey || !baseUrl) throw new Error("Azure OpenAI not configured");

  const url = `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_completion_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as any;
  return (
    data?.choices?.[0]?.message?.content || "（AI 無回應，請重試）"
  );
}

// ─── Azure OpenAI 串流 API ────────────────────────────────────────
// 回傳 ReadableStream，供 SSE 端點使用

export async function streamAzureOpenAI(
  env: Bindings,
  messages: AIMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = env.AZURE_OPENAI_API_KEY;
  const baseUrl = env.AZURE_OPENAI_BASE_URL;
  const model = env.AZURE_OPENAI_MODEL;
  if (!apiKey || !baseUrl) throw new Error("Azure OpenAI not configured");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_completion_tokens: 4096,
      stream: true,          // 開啟串流
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    throw new Error(`Azure OpenAI stream error ${res.status}: ${err}`);
  }

  // 將 Azure SSE 轉換成前端可用的純文字 SSE 流
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const token = json?.choices?.[0]?.delta?.content;
            if (token) {
              // 只把 token 內容傳給前端
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ token })}\n\n`)
              );
            }
          } catch { /* 忽略非 JSON 行 */ }
        }
      }
    },
    cancel() { reader.cancel(); }
  });
}

// ─── 公司內網 Gemma API（僅本地開發用）──────────────────
// gemma-4-31B-it (port 8001) — 大模型，品質較高
// gemma-4-E4B-it  (port 8002) — 效率型，速度較快
// 走 OpenAI-compatible API 格式

async function callInternalGemma(
  env: Bindings,
  messages: AIMessage[],
  port: 8001 | 8002
): Promise<string> {
  const baseUrl = env.INTERNAL_AI_BASE_URL || "http://10.1.2.221";
  const url = `${baseUrl}:${port}/v1/chat/completions`;
  const model = port === 8001 ? "gemma-4-31B-it" : "gemma-4-E4B-it";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Internal Gemma (port ${port}) error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as any;
  return (
    data?.choices?.[0]?.message?.content || "（AI 無回應，請重試）"
  );
}

// ─── Unified Interface ────────────────────────────────────────────

/**
 * 統一 AI 呼叫介面
 * 預設用 Gemini Flash（快速+便宜），深度教學可切 Pro
 */
export async function chat(
  env: Bindings,
  messages: AIMessage[],
  provider: AIProvider = "azure-openai"
): Promise<AIResponse> {
  // Prepend system prompt if not present
  const hasSystem = messages.some((m) => m.role === "system");
  const fullMessages: AIMessage[] = hasSystem
    ? messages
    : [{ role: "system", content: CCNA_SYSTEM_PROMPT }, ...messages];

  let content: string;

  switch (provider) {
    case "gemini-flash":
      content = await callGemini(env, fullMessages, "gemini-3.5-flash");
      break;
    case "gemini-pro":
      content = await callGemini(env, fullMessages, "gemini-3.1-pro-preview");
      break;
    case "azure-openai":
      content = await callAzureOpenAI(env, fullMessages);
      break;
    case "internal-gemma-31b":
      content = await callInternalGemma(env, fullMessages, 8001);
      break;
    case "internal-gemma-e4b":
      content = await callInternalGemma(env, fullMessages, 8002);
      break;
    default:
      content = await callGemini(env, fullMessages, "gemini-3.5-flash");
  }

  return { content, provider };
}

/**
 * 單次問答（不含歷史對話）
 */
export async function ask(
  env: Bindings,
  question: string,
  provider: AIProvider = "azure-openai"
): Promise<AIResponse> {
  return chat(env, [{ role: "user", content: question }], provider);
}

/**
 * AI 解題：根據題目和學員答案生成個人化解析
 */
export async function explainQuestion(
  env: Bindings,
  questionText: string,
  correctAnswer: string,
  userAnswer: string,
  existingExplanation: string
): Promise<AIResponse> {
  const prompt = `學員在以下 CCNA 題目答錯了：

【題目】
${questionText}

【正確答案】${correctAnswer}
【學員的答案】${userAnswer}

【原始解析】
${existingExplanation}

請針對學員答錯的原因，用更通俗易懂的方式重新解釋：
1. 為什麼學員選的答案是錯的
2. 正確答案背後的原理
3. 記住這個知識點的技巧
4. 一個幫助理解的實際網路場景例子`;

  return ask(env, prompt, "gemini-flash");
}

/**
 * AI 考後報告：根據各領域得分生成個人化分析
 */
export async function generateExamReport(
  env: Bindings,
  domainScores: { domain: string; score: number; total: number }[],
  overallScore: number,
  passed: boolean
): Promise<AIResponse> {
  const scoreTable = domainScores
    .map((d) => `- ${d.domain}: ${d.score}/${d.total} (${Math.round((d.score / d.total) * 100)}%)`)
    .join("\n");

  const prompt = `學員剛完成一次 CCNA 模擬考試：

總分：${overallScore}%
結果：${passed ? "通過 ✅" : "未通過 ❌"}

各領域表現：
${scoreTable}

請生成一份個人化的考後分析報告：
1. 整體表現評估
2. 最需要加強的 2-3 個領域及具體建議
3. 已經掌握良好的領域
4. 未來 1-2 週的學習建議
5. 鼓勵性的總結`;

  return ask(env, prompt, "gemini-flash");
}

/**
 * AI 預測通過率
 */
export async function predictPassRate(
  env: Bindings,
  recentScores: number[],
  domainMastery: Record<string, number>,
  totalPracticed: number
): Promise<AIResponse> {
  const prompt = `根據以下學員數據，預測 CCNA 考試通過機率：

最近模擬考成績：${recentScores.join(", ")}%
各領域掌握度：${JSON.stringify(domainMastery)}
總練習題數：${totalPracticed}

請回傳 JSON 格式：
{ "passRate": 0.XX, "reasoning": "簡短分析", "advice": "建議" }`;

  return ask(env, prompt, "gemini-flash");
}

export { CCNA_SYSTEM_PROMPT, CCNA_SYSTEM_PROMPT_FULL, CCNA_SYSTEM_PROMPT_SHORT };
