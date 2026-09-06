CREATE TABLE game_play_counts (
 game_key TEXT PRIMARY KEY,
 play_count INTEGER NOT NULL DEFAULT 0 CHECK(play_count>=0),
 updated_at INTEGER NOT NULL
);
-- 1クリックごとに別のID。利用者・IP・端末指紋は保存しない。
CREATE TABLE game_play_events (
 event_id TEXT PRIMARY KEY,
 game_key TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX game_play_events_expiry ON game_play_events(created_at);
CREATE TRIGGER game_play_event_insert AFTER INSERT ON game_play_events BEGIN
 INSERT INTO game_play_counts(game_key,play_count,updated_at) VALUES(NEW.game_key,1,NEW.created_at)
 ON CONFLICT(game_key) DO UPDATE SET play_count=play_count+1,updated_at=excluded.updated_at;
END;
