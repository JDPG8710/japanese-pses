CREATE TABLE IF NOT EXISTS chess_games (
  room_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  white_user TEXT,
  black_user TEXT,
  result_json TEXT NOT NULL,
  game_json TEXT NOT NULL,
  finished_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chess_games_white ON chess_games(white_user, finished_at);
CREATE INDEX IF NOT EXISTS chess_games_black ON chess_games(black_user, finished_at);

CREATE TABLE IF NOT EXISTS playroom_tutorial_progress (
  actor_id TEXT NOT NULL,
  game TEXT NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(actor_id, game)
);
