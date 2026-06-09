# LMeter-CCNA (LearnMentor CCNA)

An AI-driven interactive teaching platform specifically designed for the **CCNA 200-301 v1.1** certification.

## 🌟 專案架構與技術棧 (Tech Stack)
* **Backend & API**: Cloudflare Workers + Hono
* **Frontend**: React (Server-Side JSX), Vanilla CSS (Custom Design System, No Tailwind)
* **Database (SQL)**: Cloudflare D1
* **Vector Database**: Cloudflare Vectorize (768 dimensions for Gemini Embeddings)
* **Authentication**: Clerk SSO
* **AI Provider**: Google Gemini API (Flash/Pro) + Fallback to Azure OpenAI
* **Deployment**: Cloudflare Workers (workers.dev & custom domain)

## 🎯 目前已完成功能 (Completed Features)
1. **AI 導師互動模式 (AI Tutor)**
   - 基於 CCNA 六大領域設計的教學 Prompt。
   - 嚴格限制範圍：針對非 CCNA 範圍提問，會固定回覆「我是CCNA認證教學大師，你的提問不在我能回覆的範圍。」。
   - 專有名詞中英對照，並提供隨堂測驗（解答隱藏在反白區塊內）。
2. **向量知識庫 (RAG)**
   - 成功匯入 1,190 題 CCNA 題庫至 Cloudflare Vectorize，供 AI 檢索相關考點。
3. **動態延伸考點 (Related Topics)**
   - 介面右側會隨機/依據提問內容顯示 CCNA 常考關鍵字，點擊後會自動帶入對話框進行提問。
4. **Clerk 會員登入 (Authentication)**
   - 整合 Clerk SSO，右上角頭像懸停時會顯示帳號與 Email 資訊。
   - 採用直接由 Frontend API 動態解析載入的方式，確保 UI Components 正確渲染。
5. **部署設定**
   - 原始碼已託管至 GitHub (`https://github.com/yangkunta/LMeter-CCNA`)。
   - 已建立正式環境 `https://learnmentor-ccna.yangkunta.workers.dev`。

## 🚧 尚未完成與未來規劃 (WIP & Planned)
1. **Cloudflare 自訂網域綁定**
   - 目標網址：`https://lmentor-ccna.works`
   - **待辦**：需等使用者在 Cloudflare 控制台設定好 DNS 驗證後，於 `wrangler.jsonc` 中取消註解 `routes` 區塊，再次部署即可生效。
2. **刷題與模擬考系統 (Practice & Exam Mode)**
   - 目前點擊選單只會提示「還在規畫中」。
   - 未來需開發依據各大類主題進行隨機出題、倒數計時與成績結算的獨立頁面。
3. **學習進度儀表板 (Dashboard)**
   - 透過提問與測驗紀錄，收集並分析登入使用者的學習狀態。
   - 用圖表或進度條呈現學員在 CCNA 六大領域的掌握度，避免重複在特定領域卡關。
4. **拖拉題/圖片題處理**
   - 目前題庫中有約 10% 為拖拉題（問題與答案多為圖片）。
   - **待辦**：需討論這類題目的轉換與儲存方式（例如轉成文字描述，或是直接將圖片上傳至 R2 Storage 供前端渲染）。若無法處理，則暫不收錄。

## 📜 專案開發規則與注意事項 (Global Rules for AI Agent)
為了讓後續 AI 代理人接手時能順利運作，請嚴格遵守以下規則：

1. **環境變數與金鑰安全**
   - **絕對不要**在原始碼（如 `scripts` 或 `lib`）中寫死任何 API Key (Gemini, Clerk 等)。
   - 開發與部署一律透過 Cloudflare 的 `.dev.vars` 或環境變數存取。
2. **UI 與樣式 (CSS)**
   - 專案依賴 Vanilla CSS，**不要引入 TailwindCSS**。
   - 所有的互動元件（如未完成按鈕）需維持現有設計風格（如 `var(--accent-blue)` 等玻璃擬態與漸層效果）。
3. **Clerk 腳本載入方式**
   - 由於使用 Server-Side JSX，載入 Clerk JS 時必須動態解析 `clerkKey` 來獲取 Frontend API 網域。不要依賴 `cdn.jsdelivr.net` 的標準包（會報錯 `Clerk was not loaded with Ui components`）。
4. **PowerShell 指令**
   - 若在本地執行 PowerShell，多重指令請使用 `;` 分隔，**嚴禁使用 `&&`**。
5. **AI Prompt 限制**
   - `src/lib/ai.ts` 中已經設定好嚴格的領域檢查與教學原則，後續若要新增其他認證（如 CCNP）需另開 Prompt，不可覆蓋現有的 CCNA 規則。

---
*文件更新時間：2026-06-10*
