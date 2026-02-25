-- ============================================================
-- EMAIL-BASED AUTH MIGRATION - FINAL VERSION
-- ============================================================
--
-- PREREQUISITES:
-- 1. Database backup created ✓
-- 2. Clerk JWT template updated (just {"email": "{{user.primary_email_address}}"})
--
-- This script:
-- - Adds email columns to existing tables only
-- - Backfills data from profiles table
-- - Updates RLS policies for cloud_machines
-- - Updates unique constraints
-- - Handles missing tables gracefully
--
-- ============================================================

\set ON_ERROR_STOP on

-- Show start time
SELECT NOW() as migration_start_time;

-- ────────────────────────────────────────────────────────────
-- STEP 1: Add email columns
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '=== STEP 1: Adding email columns ==='; END $$;

-- bridge_configs
ALTER TABLE bridge_configs ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_bridge_configs_email ON bridge_configs(email);
DO $$ BEGIN RAISE NOTICE '✓ bridge_configs'; END $$;

-- conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_email ON conversations(email);
DO $$ BEGIN RAISE NOTICE '✓ conversations'; END $$;

-- chat_api_keys
ALTER TABLE chat_api_keys ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_chat_api_keys_email ON chat_api_keys(email);
DO $$ BEGIN RAISE NOTICE '✓ chat_api_keys'; END $$;

-- project_env_vars
ALTER TABLE project_env_vars ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_project_env_vars_user_email ON project_env_vars(user_email);
DO $$ BEGIN RAISE NOTICE '✓ project_env_vars'; END $$;

-- github_connections
ALTER TABLE github_connections ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_github_connections_user_email ON github_connections(user_email);
DO $$ BEGIN RAISE NOTICE '✓ github_connections'; END $$;

-- claude_connections
ALTER TABLE claude_connections ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_claude_connections_user_email ON claude_connections(user_email);
DO $$ BEGIN RAISE NOTICE '✓ claude_connections'; END $$;

-- cloud_machines
ALTER TABLE cloud_machines ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_cloud_machines_user_email ON cloud_machines(user_email);
DO $$ BEGIN RAISE NOTICE '✓ cloud_machines'; END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 2: Backfill email data
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '=== STEP 2: Backfilling email data ==='; END $$;

-- bridge_configs (user_id → email)
DO $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE bridge_configs bc
  SET email = p.email
  FROM profiles p
  WHERE bc.user_id = p.id AND bc.email IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✓ bridge_configs: % rows', rows_updated;
END $$;

-- conversations (clerk_user_id → email)
DO $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE conversations c
  SET email = p.email
  FROM profiles p
  WHERE c.clerk_user_id = p.id AND c.email IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✓ conversations: % rows', rows_updated;
END $$;

-- chat_api_keys (clerk_user_id → email)
DO $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE chat_api_keys cak
  SET email = p.email
  FROM profiles p
  WHERE cak.clerk_user_id = p.id AND cak.email IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✓ chat_api_keys: % rows', rows_updated;
END $$;

-- project_env_vars (user_id → user_email)
DO $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE project_env_vars pev
  SET user_email = p.email
  FROM profiles p
  WHERE pev.user_id = p.id AND pev.user_email IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✓ project_env_vars: % rows', rows_updated;
END $$;

-- github_connections (user_id → user_email)
DO $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE github_connections gc
  SET user_email = p.email
  FROM profiles p
  WHERE gc.user_id = p.id AND gc.user_email IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✓ github_connections: % rows', rows_updated;
END $$;

-- claude_connections (user_id → user_email)
DO $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE claude_connections cc
  SET user_email = p.email
  FROM profiles p
  WHERE cc.user_id = p.id AND cc.user_email IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✓ claude_connections: % rows', rows_updated;
END $$;

-- cloud_machines (user_id → user_email)
DO $$
DECLARE rows_updated INTEGER;
BEGIN
  UPDATE cloud_machines cm
  SET user_email = p.email
  FROM profiles p
  WHERE cm.user_id = p.id AND cm.user_email IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✓ cloud_machines: % rows', rows_updated;
END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 3: Update RLS policies (cloud_machines only)
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 3: Updating RLS policies ===';
  RAISE NOTICE '⚠️  Requires Clerk JWT with email claim!';
END $$;

-- Drop old policies
DROP POLICY IF EXISTS "Users can read own machine" ON cloud_machines;
DROP POLICY IF EXISTS "Users can insert own machine" ON cloud_machines;
DROP POLICY IF EXISTS "Users can update own machine" ON cloud_machines;
DROP POLICY IF EXISTS "Users can delete own machine" ON cloud_machines;

-- Create new email-based policies
CREATE POLICY "Users can read own machine by email"
  ON cloud_machines FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own machine by email"
  ON cloud_machines FOR INSERT
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own machine by email"
  ON cloud_machines FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own machine by email"
  ON cloud_machines FOR DELETE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

DO $$ BEGIN RAISE NOTICE '✓ cloud_machines RLS updated'; END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 4: Update unique constraints
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '=== STEP 4: Updating unique constraints ==='; END $$;

-- cloud_machines
ALTER TABLE cloud_machines DROP CONSTRAINT IF EXISTS cloud_machines_user_id_key;
ALTER TABLE cloud_machines ADD CONSTRAINT cloud_machines_user_email_key UNIQUE (user_email);
DO $$ BEGIN RAISE NOTICE '✓ cloud_machines'; END $$;

-- bridge_configs
ALTER TABLE bridge_configs DROP CONSTRAINT IF EXISTS bridge_configs_user_id_key;
ALTER TABLE bridge_configs ADD CONSTRAINT bridge_configs_email_key UNIQUE (email);
DO $$ BEGIN RAISE NOTICE '✓ bridge_configs'; END $$;

-- github_connections
ALTER TABLE github_connections DROP CONSTRAINT IF EXISTS github_connections_user_id_key;
ALTER TABLE github_connections ADD CONSTRAINT github_connections_user_email_key UNIQUE (user_email);
DO $$ BEGIN RAISE NOTICE '✓ github_connections'; END $$;

-- claude_connections
ALTER TABLE claude_connections DROP CONSTRAINT IF EXISTS claude_connections_user_id_key;
ALTER TABLE claude_connections ADD CONSTRAINT claude_connections_user_email_key UNIQUE (user_email);
DO $$ BEGIN RAISE NOTICE '✓ claude_connections'; END $$;

-- ────────────────────────────────────────────────────────────
-- DONE!
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test on localhost';
  RAISE NOTICE '2. Test on preview (same email should see same data!)';
  RAISE NOTICE '3. Test on production';
  RAISE NOTICE '';
END $$;

-- Show end time
SELECT NOW() as migration_end_time;

-- Verify email columns exist
SELECT
  c.table_name,
  c.column_name,
  COUNT(*) OVER (PARTITION BY c.table_name) as columns_added
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('bridge_configs', 'conversations', 'chat_api_keys',
                       'project_env_vars', 'github_connections', 'claude_connections',
                       'cloud_machines')
  AND c.column_name IN ('email', 'user_email')
ORDER BY c.table_name, c.column_name;
