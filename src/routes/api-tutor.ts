// ─── AI 教學助手 API ──────────────────────────────────────────────
// 掛載在 /api/tutor 下
// POST /api/tutor/chat    — 與 AI 導師對話
// POST /api/tutor/explain — AI 解析錯題

import { Hono } from 'hono';
import type { AppEnv, AIMessage, AIProvider } from '../types';
import { verifyClerkToken, extractToken } from '../auth';
import { chat, explainQuestion, streamGemini,
  CCNA_SYSTEM_PROMPT_FULL, CCNA_SYSTEM_PROMPT_SHORT } from '../lib/ai';

const route = new Hono<AppEnv>();

// ─── 驗證身份（開發期間可選）────────────────────────────────────────
async function optionalAuth(c: any): Promise<string> {
  const token = extractToken(c.req.header('Authorization'));
  if (!token) return 'anonymous';
  const payload = await verifyClerkToken(token);
  return payload?.sub || 'anonymous';
}

// ─── POST /api/tutor/stream  (SSE 串流對話) ───────────────────────
route.post('/stream', async (c) => {
  try {
    const body = await c.req.json<{
      messages: AIMessage[];
      mode?: 'standard' | 'full';
    }>();

    if (!body.messages?.length) {
      return c.json({ error: 'messages required' }, 400);
    }

    // 選擇 System Prompt 和模型
    let systemPrompt = CCNA_SYSTEM_PROMPT_FULL;
    let model: "gemini-3.5-flash" | "gemini-3.1-pro-preview" = "gemini-3.1-pro-preview";

    if (body.mode === 'standard') {
      systemPrompt = CCNA_SYSTEM_PROMPT_SHORT;
      model = "gemini-3.5-flash";
    }

    // 加入 system prompt（如果沒有）
    const hasSystem = body.messages.some(m => m.role === 'system');
    let finalSystemPrompt = hasSystem ? body.messages.find(m => m.role === 'system')!.content : systemPrompt;

    // RAG 題庫搜尋 (隨堂測驗用)
    try {
      const userMessage = body.messages.filter(m => m.role === 'user').pop()?.content || '';
      if (userMessage.length > 5) {
        const { getGeminiEmbedding } = await import('../lib/ai');
        const queryVector = await getGeminiEmbedding(c.env, userMessage);
        if (queryVector.length > 0) {
          const matches = await c.env.VECTOR_INDEX.query(queryVector, { topK: 2, returnMetadata: 'all' });
          if (matches.matches.length > 0) {
            const questionIds = matches.matches.map(m => m.id);
            const placeholders = questionIds.map(() => '?').join(',');
            const qs = await c.env.DB.prepare(`SELECT question_en, question_zh, options_json, answer_json FROM questions WHERE id IN (${placeholders})`).bind(...questionIds).all<any>();
            
            if (qs.results && qs.results.length > 0) {
              const quizContext = qs.results.map((q, i) => `題目${i+1}:\n${q.question_en}\n${q.question_zh}\n選項: ${q.options_json}\n解答: ${q.answer_json}`).join('\n\n');
              finalSystemPrompt += `\n\n【隨堂測驗考題庫】\n請從以下真實題庫中挑選1題，在你的回覆最後做為隨堂測驗考驗學員：\n${quizContext}`;
            }
          }
        }
      }
    } catch (err) {
      console.error("RAG search failed:", err);
      // Fail silently and continue without RAG
    }

    const fullMessages: AIMessage[] = body.messages.filter(m => m.role !== 'system');
    fullMessages.unshift({ role: 'system', content: finalSystemPrompt });

    // 改用 Gemini 串流，並帶入對應模式的最佳模型
    const stream = await streamGemini(c.env, fullMessages, model);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return c.json({ error: 'Stream failed', detail: e?.message }, 500);
  }
});

// ─── POST /api/tutor/chat ─────────────────────────────────────────
route.post('/chat', async (c) => {
  try {
    const userId = await optionalAuth(c);

    const body = await c.req.json<{
      messages: AIMessage[];
      provider?: AIProvider;
    }>();

    if (!body.messages || body.messages.length === 0) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    // 呼叫 AI 統一介面（預設 azure-openai）
    const response = await chat(c.env, body.messages, body.provider);

    return c.json({
      reply: response.content,
      provider: response.provider,
    });
  } catch (e: any) {
    console.error('AI chat error:', e);
    return c.json({ error: 'AI chat failed', detail: e?.message }, 500);
  }
});

// ─── POST /api/tutor/explain ──────────────────────────────────────
route.post('/explain', async (c) => {
  try {
    const userId = await optionalAuth(c);

    const body = await c.req.json<{
      questionId: string;
      userAnswer: string;
    }>();

    if (!body.questionId) {
      return c.json({ error: 'questionId is required' }, 400);
    }

    // 從 D1 取得題目資訊
    const question = await c.env.DB.prepare(
      `SELECT * FROM questions WHERE id = ?`
    ).bind(body.questionId).first<any>();

    if (!question) {
      return c.json({ error: 'Question not found' }, 404);
    }

    const questionText = `${question.question_en}\n${question.question_zh}`;
    const correctAnswer = JSON.parse(question.answer_json || '[]').join(', ');
    const explanation = question.explanation_zh || '';

    const response = await explainQuestion(
      c.env,
      questionText,
      correctAnswer,
      body.userAnswer,
      explanation
    );

    return c.json({
      explanation: response.content,
      provider: response.provider,
    });
  } catch (e: any) {
    console.error('AI explain error:', e);
    return c.json({ error: 'AI explain failed', detail: e?.message }, 500);
  }
});

export default route;
