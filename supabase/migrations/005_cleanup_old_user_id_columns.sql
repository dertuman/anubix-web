-- Migration: Clean up old user_id columns (OPTIONAL - Run only after verifying email-based auth works)
--
-- ⚠️  WARNING: This is a DESTRUCTIVE migration
-- ⚠️  Only run this AFTER:
--    1. All migrations (001-004) have been applied
--    2. Clerk JWT template includes email claim
--    3. Application is tested and working with email-based auth
--    4. You have a database backup
--
-- This migration is OPTIONAL and can be run later if you want to fully remove
-- the old user_id/clerk_user_id columns. You may choose to keep them for backward
-- compatibility or historical reference.

-- ============================================================
-- STEP 1: Drop old user_id indexes (if they exist)
-- ============================================================

DROP INDEX IF EXISTS idx_cloud_machines_user_id;
DROP INDEX IF EXISTS idx_conversations_user_id;
DROP INDEX IF EXISTS idx_bridge_configs_user_id;
DROP INDEX IF EXISTS idx_github_connections_user_id;
DROP INDEX IF EXISTS idx_claude_connections_user_id;
DROP INDEX IF EXISTS idx_chat_api_keys_user_id;
DROP INDEX IF EXISTS idx_project_env_vars_user_id;

-- ============================================================
-- STEP 2: Drop old user_id columns
-- ============================================================

-- Note: We're NOT dropping these yet to allow for rollback
-- Uncomment these lines ONLY when you're 100% confident email-based auth works

-- ALTER TABLE cloud_machines DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE bridge_configs DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE conversations DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE chat_api_keys DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE project_env_vars DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE github_connections DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE claude_connections DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS clerk_user_id;

-- ============================================================
-- STEP 3: Rename email columns to make them primary (OPTIONAL)
-- ============================================================

-- If you want cleaner schema, you can rename user_email -> user_id
-- This makes "user_id" mean "user email" instead of "Clerk user ID"
-- Only do this if you want to preserve the column name "user_id"

-- ALTER TABLE cloud_machines RENAME COLUMN user_email TO user_id;
-- ALTER TABLE conversations RENAME COLUMN user_email TO user_id;
-- ALTER TABLE chat_api_keys RENAME COLUMN user_email TO user_id;
-- ALTER TABLE project_env_vars RENAME COLUMN user_email TO user_id;
-- ALTER TABLE github_connections RENAME COLUMN user_email TO user_id;
-- ALTER TABLE claude_connections RENAME COLUMN user_email TO user_id;
-- -- bridge_configs and subscriptions already use 'email', so no rename needed

-- ============================================================
-- Verification
-- ============================================================

-- Check which tables still have old user_id columns
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'cloud_machines',
    'bridge_configs',
    'conversations',
    'chat_api_keys',
    'project_env_vars',
    'github_connections',
    'claude_connections',
    'subscriptions'
  )
  AND column_name IN ('user_id', 'clerk_user_id', 'user_email', 'email')
ORDER BY table_name, column_name;
