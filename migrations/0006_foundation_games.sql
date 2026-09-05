CREATE TABLE IF NOT EXISTS foundation_runs (
 run_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 profile TEXT NOT NULL,
 school_year TEXT NOT NULL,
 lesson TEXT NOT NULL,
 locale TEXT NOT NULL,
 learning_language TEXT NOT NULL,
 version TEXT NOT NULL,
 rounds_json TEXT NOT NULL,
 started_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 completed_at INTEGER,
 round_index INTEGER NOT NULL DEFAULT 0 CHECK(round_index BETWEEN 0 AND 10),
 tries INTEGER NOT NULL DEFAULT 0 CHECK(tries BETWEEN 0 AND 2),
 revision INTEGER NOT NULL DEFAULT 0,
 score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 1000)
);
CREATE INDEX IF NOT EXISTS foundation_board ON foundation_runs(profile,school_year,lesson,locale,learning_language,version,completed_at,score);
CREATE INDEX IF NOT EXISTS foundation_rate ON foundation_runs(user_id,started_at);
