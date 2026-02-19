-- Chat Web Migration
-- Extends the existing chat tables (created by anubix-native) with web-specific columns.
-- Run this script in your Supabase SQL Editor.
-- IMPORTANT: This is safe to run multiple times (idempotent with IF NOT EXISTS).

-- =============================================================================
-- EXTEND MESSAGES TABLE
-- =============================================================================

-- Rich file attachments: [{"name":"file.pdf","mimeType":"application/pdf","size":1234,"category":"pdf"}]
ALTER TABLE messages ADD COLUMN IF NOT EXISTS files JSONB DEFAULT NULL;

-- Which AI model generated this response (assistant messages only)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model TEXT DEFAULT NULL;

-- =============================================================================
-- EXTEND CONVERSATIONS TABLE
-- =============================================================================

-- Sharing support
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;

-- =============================================================================
-- PER-USER ENCRYPTED API KEYS
-- =============================================================================

CREATE TABLE IF NOT EXISTS chat_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Clerk user ID
  clerk_user_id TEXT NOT NULL,

  -- Provider: openai, google, anthropic
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'google', 'anthropic')),

  -- AES-256-GCM encrypted key components
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One key per provider per user
  UNIQUE(clerk_user_id, provider)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_chat_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chat_api_keys_updated_at ON chat_api_keys;
CREATE TRIGGER update_chat_api_keys_updated_at
  BEFORE UPDATE ON chat_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_api_keys_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE chat_api_keys ENABLE ROW LEVEL SECURITY;

-- Allow all operations (Clerk handles auth at the app level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_api_keys' AND policyname = 'Allow all access to chat_api_keys'
  ) THEN
    CREATE POLICY "Allow all access to chat_api_keys"
      ON chat_api_keys FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_chat_api_keys_user ON chat_api_keys(clerk_user_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT
  '✅ Chat web migration complete!' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'files') as messages_files_col,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'model') as messages_model_col,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'is_shared') as conversations_is_shared_col,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'share_id') as conversations_share_id_col,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'chat_api_keys') as chat_api_keys_table;
