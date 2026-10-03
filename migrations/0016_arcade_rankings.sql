CREATE TABLE IF NOT EXISTS arcade_players(user_id TEXT PRIMARY KEY, public_name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS arcade_runs(run_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,game TEXT NOT NULL,level INTEGER NOT NULL,version INTEGER NOT NULL,started_at INTEGER NOT NULL,completed_at INTEGER,score INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS arcade_board ON arcade_runs(game,level,version,completed_at,score);
CREATE INDEX IF NOT EXISTS arcade_user_runs ON arcade_runs(user_id,started_at);
