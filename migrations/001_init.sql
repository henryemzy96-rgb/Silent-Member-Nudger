CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  username TEXT,
  first_name TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  nudged_at TIMESTAMPTZ,
  opted_out BOOLEAN DEFAULT false,
  UNIQUE(chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_last_active ON members(last_active);
