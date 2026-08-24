ALTER TABLE guest_trials ADD COLUMN used_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guest_trials ADD COLUMN last_heartbeat_at INTEGER;
ALTER TABLE guest_trials ADD COLUMN is_playing INTEGER NOT NULL DEFAULT 0;

-- 旧方式では開始後の経過時間しか分からないため、利用者に不利にならないよう
-- 新方式へ移行する時点の累積利用時間は0に戻し、同じ週次期間だけを引き継ぐ。
UPDATE guest_trials
SET policy_version = 3,
    status = 'ACTIVE',
    used_ms = 0,
    last_heartbeat_at = NULL,
    is_playing = 0,
    expires_at = block_expires_at,
    updated_at = CAST(unixepoch('subsec') * 1000 AS INTEGER);

CREATE INDEX IF NOT EXISTS idx_guest_trials_status_period
  ON guest_trials(status, block_expires_at);
