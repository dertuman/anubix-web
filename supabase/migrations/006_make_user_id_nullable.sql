-- Migration: Make user_id columns nullable to allow email-only inserts
-- This is a safer alternative to dropping user_id columns entirely
-- Allows backward compatibility while enabling email-based auth

-- ============================================================
-- Make user_id columns nullable on all tables
-- ============================================================

ALTER TABLE github_connections
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE claude_connections
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE bridge_configs
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE cloud_machines
ALTER COLUMN user_id DROP NOT NULL;

-- Note: conversations, chat_api_keys, project_env_vars likely already nullable
ALTER TABLE conversations
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE chat_api_keys
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE project_env_vars
ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- Verification
-- ============================================================
SELECT
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'github_connections',
    'claude_connections',
    'bridge_configs',
    'cloud_machines',
    'conversations',
    'chat_api_keys',
    'project_env_vars'
  )
  AND column_name = 'user_id'
ORDER BY table_name;
