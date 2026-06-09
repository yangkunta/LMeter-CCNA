-- ═══════════════════════════════════════════════════════════════════
-- CCNA-MT D1 Schema
-- AI 學習專家系統 — 主資料庫結構
-- ═══════════════════════════════════════════════════════════════════

-- ─── 題目表 ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    domain TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('single', 'multiple', 'drag_drop')),
    question_en TEXT NOT NULL,
    question_zh TEXT NOT NULL,
    options_json TEXT NOT NULL DEFAULT '[]',
    answer_json TEXT NOT NULL DEFAULT '[]',
    explanation_zh TEXT,
    keywords_json TEXT DEFAULT '[]',
    image_url TEXT,
    answer_image_url TEXT,
    extra_images_json TEXT,
    difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
    "order" INTEGER DEFAULT 0,
    bank TEXT NOT NULL DEFAULT '460',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_domain ON questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- ─── 知識點表（知識圖譜）─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_points (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    domain_weight INTEGER NOT NULL DEFAULT 0,
    topic TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_zh TEXT NOT NULL,
    description TEXT,
    prerequisite_ids_json TEXT DEFAULT '[]',
    related_question_ids_json TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kp_domain ON knowledge_points(domain);

-- ─── 使用者學習進度 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT NOT NULL,
    knowledge_point_id TEXT NOT NULL,
    mastery_level REAL DEFAULT 0.0 CHECK(mastery_level BETWEEN 0.0 AND 1.0),
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_practiced_at INTEGER,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, knowledge_point_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);

-- ─── 答題記錄 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS answer_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer_json TEXT NOT NULL,
    is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
    mode TEXT NOT NULL CHECK(mode IN ('practice', 'exam', 'review', 'diagnostic')),
    time_spent_ms INTEGER DEFAULT 0,
    bank TEXT NOT NULL DEFAULT '460',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_answer_user ON answer_records(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_answer_question ON answer_records(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_mode ON answer_records(user_id, mode);

-- ─── 模擬考記錄 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    score REAL NOT NULL,
    passed INTEGER NOT NULL CHECK(passed IN (0, 1)),
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    pass_threshold REAL NOT NULL DEFAULT 0.75,
    domain_scores_json TEXT,
    wrong_question_ids_json TEXT DEFAULT '[]',
    ai_report TEXT,
    bank TEXT NOT NULL DEFAULT '460',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_exam_user ON exam_records(user_id, created_at);

-- ─── 收藏與錯題 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_bookmarks (
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('star', 'wrong')),
    wrong_count INTEGER DEFAULT 0,
    last_wrong_at INTEGER,
    bank TEXT NOT NULL DEFAULT '460',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, question_id, type, bank)
);

CREATE INDEX IF NOT EXISTS idx_bookmark_user ON user_bookmarks(user_id, type);

-- ─── 學習路徑 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_paths (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    path_json TEXT NOT NULL,
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused')),
    ai_recommendation TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_path_user ON learning_paths(user_id, status);

-- ─── 能力診斷記錄 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostic_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    domain_scores_json TEXT NOT NULL,
    overall_level TEXT NOT NULL CHECK(overall_level IN ('beginner', 'intermediate', 'advanced')),
    weak_domains_json TEXT DEFAULT '[]',
    strong_domains_json TEXT DEFAULT '[]',
    recommended_path_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_user ON diagnostic_records(user_id, created_at);
