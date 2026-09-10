CREATE TABLE IF NOT EXISTS go_games (
  room_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  black_user TEXT,
  white_user TEXT,
  result_json TEXT NOT NULL,
  game_json TEXT NOT NULL,
  finished_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS go_games_black ON go_games(black_user, finished_at);
CREATE INDEX IF NOT EXISTS go_games_white ON go_games(white_user, finished_at);
