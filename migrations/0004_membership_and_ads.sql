CREATE TABLE IF NOT EXISTS memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'AD_FREE_LIFETIME')),
  ad_free INTEGER NOT NULL DEFAULT 0 CHECK (ad_free IN (0, 1)),
  price_paid_jpy INTEGER NOT NULL DEFAULT 0 CHECK (price_paid_jpy >= 0),
  payment_provider TEXT,
  provider_customer_id TEXT,
  provider_payment_id TEXT,
  purchased_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_provider_payment
  ON memberships(payment_provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  amount_jpy INTEGER NOT NULL DEFAULT 0 CHECK (amount_jpy >= 0),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_user_received
  ON payment_events(user_id, received_at DESC);
