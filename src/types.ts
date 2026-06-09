// ─── Cloudflare Workers 環境綁定型別 ──────────────────────────────────

export type Bindings = {
  // Cloudflare D1 (主資料庫)
  DB: D1Database;

  // Cloudflare Vectorize (向量搜尋)
  VECTOR_INDEX: VectorizeIndex;

  // Firestore REST API (輔助)
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  FIREBASE_WEB_API_KEY: string;

  // Clerk 認證
  CLERK_PUBLISHABLE_KEY: string;

  // AI Provider Keys (Secrets)
  GEMINI_API_KEY: string;
  AZURE_OPENAI_API_KEY: string;
  AZURE_OPENAI_BASE_URL: string;
  AZURE_OPENAI_MODEL: string;

  // 內網 AI（僅本地開發時可用）
  INTERNAL_AI_BASE_URL?: string;  // e.g. http://10.1.2.221
};

// ─── App Context ───────────────────────────────────────────────────

export type AppEnv = { Bindings: Bindings };

// ─── CCNA 考試領域 ─────────────────────────────────────────────────

export const CCNA_DOMAINS = [
  { id: "network-fundamentals", name: "Network Fundamentals", weight: 20 },
  { id: "network-access", name: "Network Access", weight: 20 },
  { id: "ip-connectivity", name: "IP Connectivity", weight: 25 },
  { id: "ip-services", name: "IP Services", weight: 10 },
  { id: "security-fundamentals", name: "Security Fundamentals", weight: 15 },
  { id: "automation-programmability", name: "Automation and Programmability", weight: 10 },
] as const;

export type CCNADomainId = (typeof CCNA_DOMAINS)[number]["id"];

// ─── Question Types ────────────────────────────────────────────────

export type QuestionType = "single" | "multiple" | "drag_drop";

export interface QuestionOption {
  label: string;
  textEn: string;
  textZh: string;
}

export interface QuestionKeyword {
  en: string;
  zh: string;
}

export interface Question {
  id: string;
  category: string;
  domain: string;
  type: QuestionType;
  questionEn: string;
  questionZh: string;
  options: QuestionOption[];
  answer: string[];
  explanationZh: string;
  keywords: QuestionKeyword[];
  imageUrl: string | null;
  answerImageUrl: string | null;
  extraImages: string[];
  difficulty: number;
  order: number;
  bank: string;
}

// ─── User Progress Types ───────────────────────────────────────────

export interface UserProgress {
  knowledgePointId: string;
  masteryLevel: number;
  totalAttempts: number;
  correctAttempts: number;
  streak: number;
  lastPracticedAt: number | null;
}

export interface DomainScore {
  domain: string;
  domainName: string;
  score: number;
  total: number;
  correct: number;
  weight: number;
}

// ─── Exam Types ────────────────────────────────────────────────────

export interface ExamRecord {
  id: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  durationSeconds: number;
  passThreshold: number;
  domainScores: DomainScore[];
  wrongQuestionIds: string[];
  aiReport: string | null;
  bank: string;
  createdAt: number;
}

export interface ExamSubmission {
  answers: Record<string, string[]>;
  durationSeconds: number;
  bank: string;
  passThreshold?: number;
}

// ─── AI Types ──────────────────────────────────────────────────────

export type AIProvider =
  | "gemini-flash"
  | "gemini-pro"
  | "azure-openai"
  | "internal-gemma-31b"   // 公司內網 gemma-4-31B-it (port 8001)
  | "internal-gemma-e4b";  // 公司內網 gemma-4-E4B-it (port 8002)

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  tokensUsed?: number;
}

// ─── Bookmark Types ────────────────────────────────────────────────

export type BookmarkType = "star" | "wrong";

export interface Bookmark {
  questionId: string;
  type: BookmarkType;
  wrongCount: number;
  lastWrongAt: number | null;
  bank: string;
}

// ─── Learning Path Types ───────────────────────────────────────────

export interface LearningPathStep {
  knowledgePointId: string;
  domain: string;
  title: string;
  type: "learn" | "practice" | "review";
  completed: boolean;
}

export interface LearningPath {
  id: string;
  steps: LearningPathStep[];
  currentStep: number;
  totalSteps: number;
  status: "active" | "completed" | "paused";
  aiRecommendation: string | null;
}

// ─── Diagnostic Types ──────────────────────────────────────────────

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface DiagnosticResult {
  id: string;
  domainScores: DomainScore[];
  overallLevel: SkillLevel;
  weakDomains: string[];
  strongDomains: string[];
  recommendedPathId: string | null;
  createdAt: number;
}

// ─── Dashboard Types ───────────────────────────────────────────────

export interface DashboardData {
  domainScores: DomainScore[];
  recentExams: ExamRecord[];
  totalPracticed: number;
  overallAccuracy: number;
  predictedPassRate: number | null;
  streak: number;
  recommendedAction: string;
}
