// ─── 題庫匯入腳本 ──────────────────────────────────────────────────
// 將舊系統的 JSON 題庫匯入 D1 資料庫
// 用法: npx wrangler d1 execute ccna_mt_db --file=./schema.sql --local
//       npx tsx scripts/import-questions.ts
//
// 或手動複製 SQL 到 wrangler d1 execute

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 設定 ──────────────────────────────────────────────────────────

const SOURCE_FILES = [
  {
    path: resolve(__dirname, "../../../QryIME/IMEQry-GSPK/public/static/ccna-data/questions.json"),
    bank: "460",
  },
  {
    path: resolve(__dirname, "../../../QryIME/IMEQry-GSPK/public/static/ccna-data/questions-900.json"),
    bank: "900",
  },
];

const OUTPUT_SQL = resolve(__dirname, "../import-data.sql");

// ─── 領域映射 ──────────────────────────────────────────────────────

const CATEGORY_TO_DOMAIN: Record<string, string> = {
  part1: "Network Fundamentals",
  part2: "Network Access",
  part3: "IP Connectivity",
  part4: "IP Services",
  part5: "Network Access",
  part6: "Security Fundamentals",
  part7: "IP Services",
  part8: "Security Fundamentals",
};

// ─── 主程式 ────────────────────────────────────────────────────────

function escapeSQL(str: string | null | undefined): string {
  if (!str) return "NULL";
  return "'" + str.replace(/'/g, "''") + "'";
}

function processQuestionBank(filePath: string, bank: string): string[] {
  console.log(`📖 Reading ${filePath}...`);
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  const questions = data.questions || [];
  console.log(`   Found ${questions.length} questions (bank: ${bank})`);

  const statements: string[] = [];

  for (const q of questions) {
    const domain = CATEGORY_TO_DOMAIN[q.category] || "Network Fundamentals";
    const optionsJson = JSON.stringify(q.options || []);
    const answerJson = JSON.stringify(q.answer || []);
    const keywordsJson = JSON.stringify(q.keywords || []);
    const extraImagesJson = q.extraImages
      ? JSON.stringify(q.extraImages)
      : "NULL";

    // 確保 NOT NULL 欄位有值（部分 drag_drop 題目可能缺少文字）
    const questionEn = q.questionEn || q.questionZh || "(See exhibit)";
    const questionZh = q.questionZh || q.questionEn || "（請參考圖示）";

    const sql = `INSERT OR REPLACE INTO questions (id, category, domain, type, question_en, question_zh, options_json, answer_json, explanation_zh, keywords_json, image_url, answer_image_url, extra_images_json, difficulty, "order", bank) VALUES (${escapeSQL(q.id)}, ${escapeSQL(q.category)}, ${escapeSQL(domain)}, ${escapeSQL(q.type || "single")}, ${escapeSQL(questionEn)}, ${escapeSQL(questionZh)}, ${escapeSQL(optionsJson)}, ${escapeSQL(answerJson)}, ${escapeSQL(q.explanationZh || "")}, ${escapeSQL(keywordsJson)}, ${escapeSQL(q.image)}, ${escapeSQL(q.answerImage)}, ${extraImagesJson === "NULL" ? "NULL" : escapeSQL(extraImagesJson)}, ${q.difficulty || 3}, ${q.order || 0}, ${escapeSQL(bank)});`;

    statements.push(sql);
  }

  return statements;
}

// ─── 執行 ──────────────────────────────────────────────────────────

console.log("🚀 CCNA 題庫匯入工具\n");

const allStatements: string[] = [
  "-- Auto-generated: CCNA Question Import",
  `-- Generated at: ${new Date().toISOString()}`,
  "",
];

for (const source of SOURCE_FILES) {
  try {
    const stmts = processQuestionBank(source.path, source.bank);
    allStatements.push(`\n-- ═══ Bank: ${source.bank} (${stmts.length} questions) ═══`);
    allStatements.push(...stmts);
    console.log(`   ✅ ${stmts.length} SQL statements generated`);
  } catch (e: any) {
    console.error(`   ❌ Error processing ${source.path}: ${e.message}`);
  }
}

// Write output
writeFileSync(OUTPUT_SQL, allStatements.join("\n"), "utf-8");
console.log(`\n📝 Output: ${OUTPUT_SQL}`);
console.log(`   Total: ${allStatements.filter((s) => s.startsWith("INSERT")).length} INSERT statements`);
console.log(`\n💡 To import into local D1:`);
console.log(`   npx wrangler d1 execute ccna_mt_db --file=./import-data.sql --local`);
console.log(`\n💡 To import into remote D1:`);
console.log(`   npx wrangler d1 execute ccna_mt_db --file=./import-data.sql --remote`);
