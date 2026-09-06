-- 説明中の時間を採点対象から外す。過去の結果は変更しない。
ALTER TABLE world_runs ADD COLUMN tutorial_paused_at INTEGER;
ALTER TABLE foundation_runs ADD COLUMN tutorial_paused_at INTEGER;
