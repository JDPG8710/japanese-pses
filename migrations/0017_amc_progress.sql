-- AMC 8 / 10 / 12 hub progress bound to the signed-in account (amc.html).
-- Numbered 0017 on purpose: 0016 is 0016_arcade_rankings.sql (arcade).
--
-- amc_progress : one summary row per real-style set ('real', '10:alg'),
--                timed mock ('mock', '12') and foundation drill ('drill',
--                'number'). best_score only ever goes up.
-- amc_attempts : recent individual results (newest 30 per item). Doubles as
--                the idempotency ledger: a retried event with the same
--                attempt_id is ignored, so scores are never double-counted.
-- amc_lessons  : lesson read/complete state, last write wins by updated_at.
CREATE TABLE IF NOT EXISTS amc_progress (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('real', 'mock', 'drill')),
  item_key TEXT NOT NULL CHECK (length(item_key) BETWEEN 1 AND 32),
  best_score REAL NOT NULL DEFAULT 0 CHECK (best_score >= 0 AND best_score <= max_score),
  max_score REAL NOT NULL CHECK (max_score > 0 AND max_score <= 150),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_score REAL,
  last_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, item_key)
);

CREATE TABLE IF NOT EXISTS amc_attempts (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  attempt_id TEXT NOT NULL CHECK (length(attempt_id) BETWEEN 8 AND 96),
  kind TEXT NOT NULL CHECK (kind IN ('real', 'mock', 'drill')),
  item_key TEXT NOT NULL CHECK (length(item_key) BETWEEN 1 AND 32),
  score REAL NOT NULL CHECK (score >= 0 AND score <= max_score),
  max_score REAL NOT NULL CHECK (max_score > 0 AND max_score <= 150),
  correct INTEGER,
  blank INTEGER,
  wrong INTEGER,
  imported INTEGER NOT NULL DEFAULT 0 CHECK (imported IN (0, 1)),
  attempted_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_amc_attempts_item ON amc_attempts(user_id, kind, item_key, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_amc_attempts_created ON amc_attempts(user_id, created_at);

CREATE TABLE IF NOT EXISTS amc_lessons (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('8', '10', '12')),
  lesson_id TEXT NOT NULL CHECK (length(lesson_id) BETWEEN 1 AND 40),
  done INTEGER NOT NULL CHECK (done IN (0, 1)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, level, lesson_id)
);
