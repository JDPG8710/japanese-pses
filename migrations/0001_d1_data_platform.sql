PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS content_documents (
  document_key TEXT PRIMARY KEY,
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  etag TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/json; charset=utf-8',
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_document TEXT NOT NULL REFERENCES content_documents(document_key) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  external_key TEXT NOT NULL,
  subject_id TEXT,
  grade INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  updated_at INTEGER NOT NULL,
  UNIQUE (source_document, external_key)
);

CREATE INDEX IF NOT EXISTS idx_content_items_lookup
  ON content_items(item_type, subject_id, grade, sort_order);

CREATE TABLE IF NOT EXISTS grades (
  grade INTEGER PRIMARY KEY CHECK (grade BETWEEN 1 AND 6),
  name TEXT NOT NULL,
  alias TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  subject_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_nodes (
  node_id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6),
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL,
  bloom_depth INTEGER NOT NULL DEFAULT 1,
  mext_reference TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
  FOREIGN KEY (grade) REFERENCES grades(grade)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_nodes_grade_subject
  ON curriculum_nodes(grade, subject_id, game_type);

CREATE TABLE IF NOT EXISTS curriculum_edges (
  node_id TEXT NOT NULL REFERENCES curriculum_nodes(node_id) ON DELETE CASCADE,
  prerequisite_node_id TEXT NOT NULL REFERENCES curriculum_nodes(node_id) ON DELETE CASCADE,
  PRIMARY KEY (node_id, prerequisite_node_id),
  CHECK (node_id <> prerequisite_node_id)
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  primary_provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider_email TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

CREATE TABLE IF NOT EXISTS oauth_transactions (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  nonce TEXT NOT NULL,
  verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_transactions_expiry ON oauth_transactions(expires_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
  jti TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS guest_trials (
  guest_key TEXT PRIMARY KEY,
  policy_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED')),
  start_time INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  block_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_trials_block_expiry ON guest_trials(block_expires_at);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  star_coins INTEGER NOT NULL DEFAULT 0 CHECK (star_coins >= 0),
  cleared_nodes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(cleared_nodes_json)),
  cleared_stages_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(cleared_stages_json)),
  achievements_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(achievements_json)),
  inventory_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(inventory_json)),
  profile_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(profile_json)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS node_progress (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  mastery_score REAL NOT NULL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 1),
  unlocked_status INTEGER NOT NULL DEFAULT 0 CHECK (unlocked_status IN (0, 1)),
  highest_score INTEGER NOT NULL DEFAULT 0 CHECK (highest_score >= 0),
  completed_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_node_progress_user_updated ON node_progress(user_id, updated_at);

CREATE TABLE IF NOT EXISTS game_attempts (
  attempt_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  game_type TEXT,
  grade INTEGER CHECK (grade BETWEEN 1 AND 6),
  score INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 1),
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  details_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details_json)),
  attempted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_attempts_user_node ON game_attempts(user_id, node_id, attempted_at DESC);

CREATE TABLE IF NOT EXISTS graduation_awards (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  certificate_id TEXT NOT NULL UNIQUE,
  reward_coins INTEGER NOT NULL DEFAULT 1000,
  issued_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json))
);

