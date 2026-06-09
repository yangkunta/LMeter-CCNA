import sqlite3 from 'sqlite3';
import fs from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const DB_PATH = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/5b3828110ecc704f5fa26fecf1cb453e3b8b19a4372d3b215074d617bc5d2ea1.sqlite';

async function getEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${GEMINI_API_KEY}`;
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
    throw new Error(`Embedding error: ${await res.text()}`);
  }

  const data = await res.json() as any;
  return data?.embedding?.values || [];
}

async function main() {
  console.log("Connecting to local SQLite DB...");
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const query = "SELECT id, question_en, question_zh, options_json, answer_json FROM questions WHERE type != 'drag_drop';";
  
  db.all(query, [], async (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return;
    }
    
    console.log(`Found ${rows.length} questions to embed.`);
    
    const vectors = [];
    let successCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const q = rows[i];
      const textToEmbed = `Question: ${q.question_en}\n${q.question_zh}\nOptions: ${q.options_json}\nAnswer: ${q.answer_json}`;
      
      try {
        const vector = await getEmbedding(textToEmbed);
        vectors.push({
          id: q.id,
          values: vector,
          metadata: { type: "question" }
        });
        successCount++;
        if (i % 50 === 0) console.log(`Processed ${i} / ${rows.length}`);
        
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error(`Failed to embed question ${q.id}:`, e);
      }
    }
    
    console.log(`Successfully embedded ${successCount} questions. Writing to vectors.ndjson...`);
    
    const ndjson = vectors.map(v => JSON.stringify(v)).join('\n');
    fs.writeFileSync('vectors.ndjson', ndjson, 'utf8');
    
    console.log("Done! Run: npx wrangler vectorize insert ccna_mt_vectors --file vectors.ndjson");
  });
}

main().catch(console.error);
