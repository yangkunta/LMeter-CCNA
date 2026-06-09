// ─── AI 導師服務 ──────────────────────────────────────────────────
// 封裝 AI 呼叫，管理對話上下文

import type { Bindings, AIProvider, AIMessage, AIResponse, Question } from "../types";
import * as ai from "../lib/ai";

/**
 * AI 對話（帶歷史上下文）
 */
export async function chatWithTutor(
  env: Bindings,
  messages: AIMessage[],
  provider: AIProvider = "gemini-flash"
): Promise<AIResponse> {
  return ai.chat(env, messages, provider);
}

/**
 * AI 解釋答錯的題目
 */
export async function explainWrongAnswer(
  env: Bindings,
  question: Question,
  userAnswer: string[]
): Promise<AIResponse> {
  const questionText = `${question.questionEn}\n${question.questionZh}`;
  const correctStr = question.answer.join(", ");
  const userStr = userAnswer.join(", ");

  return ai.explainQuestion(
    env,
    questionText,
    correctStr,
    userStr,
    question.explanationZh || ""
  );
}

/**
 * AI 生成考後報告
 */
export async function generateReport(
  env: Bindings,
  domainScores: { domain: string; score: number; total: number }[],
  overallScore: number,
  passed: boolean
): Promise<AIResponse> {
  return ai.generateExamReport(env, domainScores, overallScore, passed);
}
