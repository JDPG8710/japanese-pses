CREATE TABLE IF NOT EXISTS world_players (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  public_name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS world_runs (
  run_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  game TEXT NOT NULL CHECK(game IN ('cafe','robot','garden','rhythm','data','matrix','memory','switch')),
  level INTEGER NOT NULL CHECK(level IN (1,2)),
  version INTEGER NOT NULL,
  rounds_json TEXT NOT NULL,
  round_index INTEGER NOT NULL DEFAULT 0 CHECK(round_index BETWEEN 0 AND 10),
  tries INTEGER NOT NULL DEFAULT 0 CHECK(tries BETWEEN 0 AND 2),
  revision INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 1000),
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS world_runs_board ON world_runs(game,level,version,completed_at,score);
CREATE INDEX IF NOT EXISTS world_runs_user ON world_runs(user_id,started_at);
