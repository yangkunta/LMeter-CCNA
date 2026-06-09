// ─── 儀表板資料聚合服務 ───────────────────────────────────────────

import type { DashboardData, DomainScore, ExamRecord, CCNA_DOMAINS } from "../types";

/**
 * 取得儀表板所有數據
 */
export async function getDashboardData(
  db: D1Database,
  userId: string
): Promise<DashboardData> {
  // 1. 各領域得分
  const domainScores = await calculateDomainScores(db, userId);

  // 2. 最近考試
  const examsResult = await db
    .prepare("SELECT * FROM exam_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 10")
    .bind(userId)
    .all();
  const recentExams: ExamRecord[] = (examsResult.results || []).map((r: any) => ({
    id: r.id,
    score: r.score,
    passed: !!r.passed,
    totalQuestions: r.total_questions,
    correctCount: r.correct_count,
    durationSeconds: r.duration_seconds,
    passThreshold: r.pass_threshold,
    domainScores: JSON.parse(r.domain_scores_json || "[]"),
    wrongQuestionIds: JSON.parse(r.wrong_question_ids_json || "[]"),
    aiReport: r.ai_report,
    bank: r.bank,
    createdAt: r.created_at,
  }));

  // 3. 總練習題數 + 正確率
  const statsResult = await db
    .prepare("SELECT COUNT(*) as total, SUM(is_correct) as correct FROM answer_records WHERE user_id = ?")
    .bind(userId)
    .first<{ total: number; correct: number }>();
  const totalPracticed = statsResult?.total || 0;
  const overallAccuracy = totalPracticed > 0
    ? Math.round(((statsResult?.correct || 0) / totalPracticed) * 100)
    : 0;

  // 4. 連續答對數（最近）
  const streakResult = await db
    .prepare("SELECT is_correct FROM answer_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .bind(userId)
    .all();
  let streak = 0;
  for (const row of (streakResult.results || []) as any[]) {
    if (row.is_correct) streak++;
    else break;
  }

  // 5. 推薦行動
  const weakest = domainScores
    .filter((d) => d.total > 0)
    .sort((a, b) => (a.correct / a.total) - (b.correct / b.total));
  const recommendedAction = weakest.length > 0
    ? `建議加強練習「${weakest[0].domainName}」領域，目前正確率 ${Math.round((weakest[0].correct / weakest[0].total) * 100)}%`
    : "開始你的第一次練習吧！";

  return {
    domainScores,
    recentExams,
    totalPracticed,
    overallAccuracy,
    predictedPassRate: null,
    streak,
    recommendedAction,
  };
}

/**
 * 計算各領域得分
 */
export async function calculateDomainScores(
  db: D1Database,
  userId: string
): Promise<DomainScore[]> {
  const result = await db
    .prepare(`
      SELECT q.domain,
             COUNT(*) as total,
             SUM(a.is_correct) as correct
      FROM answer_records a
      JOIN questions q ON a.question_id = q.id
      WHERE a.user_id = ?
      GROUP BY q.domain
    `)
    .bind(userId)
    .all();

  const domainWeights: Record<string, number> = {
    "Network Fundamentals": 20,
    "Network Access": 20,
    "IP Connectivity": 25,
    "IP Services": 10,
    "Security Fundamentals": 15,
    "Automation and Programmability": 10,
  };

  const scores: DomainScore[] = [];
  for (const [domain, weight] of Object.entries(domainWeights)) {
    const row = (result.results || []).find((r: any) => r.domain === domain) as any;
    scores.push({
      domain,
      domainName: domain,
      score: row ? Math.round((row.correct / row.total) * 100) : 0,
      total: row?.total || 0,
      correct: row?.correct || 0,
      weight,
    });
  }

  return scores;
}
