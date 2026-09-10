-- Arena report / block tables for child-safety governance.
CREATE TABLE IF NOT EXISTS arena_reports (
  report_id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_public_id TEXT,
  reason TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS arena_blocks (
  actor_id TEXT NOT NULL,
  blocked_public_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (actor_id, blocked_public_id)
);

CREATE INDEX IF NOT EXISTS idx_arena_reports_created ON arena_reports(created_at DESC);
