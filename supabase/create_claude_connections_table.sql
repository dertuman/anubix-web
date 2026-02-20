-- Claude credentials storage (one per user)
-- Stores encrypted Claude CLI credentials or API keys
-- so users only need to set up once, not every provision.

CREATE TABLE claude_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES profiles(id) UNIQUE,
  claude_mode text NOT NULL DEFAULT 'cli',
  auth_json_encrypted text,       -- for CLI mode (credentials.json contents)
  api_key_encrypted text,         -- for SDK mode (sk-ant-...)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE claude_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own Claude connection"
  ON claude_connections FOR ALL
  USING (user_id = (select auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (select auth.jwt() ->> 'sub'));

-- Auto-update updated_at
CREATE TRIGGER set_claude_connections_updated_at
  BEFORE UPDATE ON claude_connections
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Index for fast lookups
CREATE INDEX idx_claude_connections_user_id ON claude_connections(user_id);
