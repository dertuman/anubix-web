-- ============================================================
-- RUN ALL MIGRATIONS (Email-Based Authentication) - SAFE VERSION
-- ============================================================
--
-- This version checks if tables exist before attempting to add columns.
-- Use this if some tables might not exist in your database yet.
--
-- ⚠️  PREREQUISITES:
--    1. Database backup created
--    2. Clerk JWT template updated to include email claim
--       (see /workspace/anubix-web/CLERK_JWT_SETUP.md)
--
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- MIGRATION 001: Add email columns to all tables (SAFE)
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '=== Running Migration 001: Add email columns (safe mode) ===';
END $$;

-- 1. bridge_configs: Add email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bridge_configs') THEN
    ALTER TABLE bridge_configs ADD COLUMN IF NOT EXISTS email TEXT;
    CREATE INDEX IF NOT EXISTS idx_bridge_configs_email ON bridge_configs(email);
    RAISE NOTICE '✓ bridge_configs: email column added';
  ELSE
    RAISE NOTICE '⊘ bridge_configs table does not exist, skipping';
  END IF;
END $$;

-- 2. conversations: Add user_email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email TEXT;
    CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON conversations(email);
    RAISE NOTICE '✓ conversations: email column added';
  ELSE
    RAISE NOTICE '⊘ conversations table does not exist, skipping';
  END IF;
END $$;

-- 3. chat_api_keys: Add user_email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_api_keys') THEN
    ALTER TABLE chat_api_keys ADD COLUMN IF NOT EXISTS email TEXT;
    CREATE INDEX IF NOT EXISTS idx_chat_api_keys_user_email ON chat_api_keys(email);
    RAISE NOTICE '✓ chat_api_keys: email column added';
  ELSE
    RAISE NOTICE '⊘ chat_api_keys table does not exist, skipping';
  END IF;
END $$;

-- 4. project_env_vars: Add user_email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_env_vars') THEN
    ALTER TABLE project_env_vars ADD COLUMN IF NOT EXISTS user_email TEXT;
    CREATE INDEX IF NOT EXISTS idx_project_env_vars_user_email ON project_env_vars(user_email);
    RAISE NOTICE '✓ project_env_vars: user_email column added';
  ELSE
    RAISE NOTICE '⊘ project_env_vars table does not exist, skipping';
  END IF;
END $$;

-- 5. github_connections: Add user_email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'github_connections') THEN
    ALTER TABLE github_connections ADD COLUMN IF NOT EXISTS user_email TEXT;
    CREATE INDEX IF NOT EXISTS idx_github_connections_user_email ON github_connections(user_email);
    RAISE NOTICE '✓ github_connections: user_email column added';
  ELSE
    RAISE NOTICE '⊘ github_connections table does not exist, skipping';
  END IF;
END $$;

-- 6. claude_connections: Add user_email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claude_connections') THEN
    ALTER TABLE claude_connections ADD COLUMN IF NOT EXISTS user_email TEXT;
    CREATE INDEX IF NOT EXISTS idx_claude_connections_user_email ON claude_connections(user_email);
    RAISE NOTICE '✓ claude_connections: user_email column added';
  ELSE
    RAISE NOTICE '⊘ claude_connections table does not exist, skipping';
  END IF;
END $$;

-- 7. subscriptions: Add email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS email TEXT;
    CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
    RAISE NOTICE '✓ subscriptions: email column added';
  ELSE
    RAISE NOTICE '⊘ subscriptions table does not exist, skipping';
  END IF;
END $$;

-- 8. cloud_machines: Add user_email column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cloud_machines') THEN
    ALTER TABLE cloud_machines ADD COLUMN IF NOT EXISTS user_email TEXT;
    CREATE INDEX IF NOT EXISTS idx_cloud_machines_user_email ON cloud_machines(user_email);
    RAISE NOTICE '✓ cloud_machines: user_email column added';
  ELSE
    RAISE NOTICE '⊘ cloud_machines table does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 001 completed: Email columns added (where tables exist)';
END $$;

-- ────────────────────────────────────────────────────────────
-- MIGRATION 002: Backfill email data from profiles (SAFE)
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '=== Running Migration 002: Backfill email data ===';
END $$;

-- 1. bridge_configs: Backfill email from profiles
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bridge_configs') THEN
    UPDATE bridge_configs bc
    SET email = p.email
    FROM profiles p
    WHERE bc.user_id = p.id
    AND bc.email IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '✓ bridge_configs: % rows backfilled', rows_updated;
  END IF;
END $$;

-- 2. conversations: Backfill email from profiles (uses clerk_user_id)
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    UPDATE conversations c
    SET email = p.email
    FROM profiles p
    WHERE c.clerk_user_id = p.id
    AND c.email IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '✓ conversations: % rows backfilled', rows_updated;
  END IF;
END $$;

-- 3. chat_api_keys: Backfill email from profiles (uses clerk_user_id)
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_api_keys') THEN
    UPDATE chat_api_keys cak
    SET email = p.email
    FROM profiles p
    WHERE cak.clerk_user_id = p.id
    AND cak.email IS NULL;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '✓ chat_api_keys: % rows backfilled', rows_updated;
  END IF;
END $$;

-- 4. project_env_vars: Backfill user_email from profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_env_vars') THEN
    UPDATE project_env_vars pev SET user_email = p.email FROM profiles p WHERE pev.user_id = p.id AND pev.user_email IS NULL;
    RAISE NOTICE '✓ project_env_vars: user_email backfilled';
  END IF;
END $$;

-- 5. github_connections: Backfill user_email from profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'github_connections') THEN
    UPDATE github_connections gc SET user_email = p.email FROM profiles p WHERE gc.user_id = p.id AND gc.user_email IS NULL;
    RAISE NOTICE '✓ github_connections: user_email backfilled';
  END IF;
END $$;

-- 6. claude_connections: Backfill user_email from profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claude_connections') THEN
    UPDATE claude_connections cc SET user_email = p.email FROM profiles p WHERE cc.user_id = p.id AND cc.user_email IS NULL;
    RAISE NOTICE '✓ claude_connections: user_email backfilled';
  END IF;
END $$;

-- 7. subscriptions: Backfill email from profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    UPDATE subscriptions s SET email = p.email FROM profiles p WHERE s.clerk_user_id = p.id AND s.email IS NULL;
    RAISE NOTICE '✓ subscriptions: email backfilled';
  END IF;
END $$;

-- 8. cloud_machines: Backfill user_email from profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cloud_machines') THEN
    UPDATE cloud_machines cm SET user_email = p.email FROM profiles p WHERE cm.user_id = p.id AND cm.user_email IS NULL;
    RAISE NOTICE '✓ cloud_machines: user_email backfilled';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 002 completed: Email data backfilled';
END $$;

-- ────────────────────────────────────────────────────────────
-- MIGRATION 003: Update RLS policies (SAFE - cloud_machines only)
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '=== Running Migration 003: Update RLS policies ===';
  RAISE NOTICE '⚠️  Make sure Clerk JWT template includes email claim!';
END $$;

-- Cloud machines (most critical table)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cloud_machines') THEN
    DROP POLICY IF EXISTS "Users can read own machine" ON cloud_machines;
    DROP POLICY IF EXISTS "Users can insert own machine" ON cloud_machines;
    DROP POLICY IF EXISTS "Users can update own machine" ON cloud_machines;
    DROP POLICY IF EXISTS "Users can delete own machine" ON cloud_machines;

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

    RAISE NOTICE '✓ cloud_machines: RLS policies updated';
  ELSE
    RAISE NOTICE '⊘ cloud_machines table does not exist, skipping RLS';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003 completed (cloud_machines only)';
  RAISE NOTICE '   For other tables, run: 003_update_rls_policies_for_email.sql';
END $$;

-- ────────────────────────────────────────────────────────────
-- MIGRATION 004: Update unique constraints (SAFE)
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '=== Running Migration 004: Update unique constraints ===';
END $$;

-- Cloud machines
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cloud_machines') THEN
    ALTER TABLE cloud_machines DROP CONSTRAINT IF EXISTS cloud_machines_user_id_key;
    ALTER TABLE cloud_machines ADD CONSTRAINT cloud_machines_user_email_key UNIQUE (user_email);
    RAISE NOTICE '✓ cloud_machines: unique constraint updated';
  END IF;
END $$;

-- Bridge configs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bridge_configs') THEN
    ALTER TABLE bridge_configs DROP CONSTRAINT IF EXISTS bridge_configs_user_id_key;
    ALTER TABLE bridge_configs ADD CONSTRAINT bridge_configs_email_key UNIQUE (email);
    RAISE NOTICE '✓ bridge_configs: unique constraint updated';
  END IF;
END $$;

-- GitHub connections
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'github_connections') THEN
    ALTER TABLE github_connections DROP CONSTRAINT IF EXISTS github_connections_user_id_key;
    ALTER TABLE github_connections ADD CONSTRAINT github_connections_user_email_key UNIQUE (user_email);
    RAISE NOTICE '✓ github_connections: unique constraint updated';
  END IF;
END $$;

-- Claude connections
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claude_connections') THEN
    ALTER TABLE claude_connections DROP CONSTRAINT IF EXISTS claude_connections_user_id_key;
    ALTER TABLE claude_connections ADD CONSTRAINT claude_connections_user_email_key UNIQUE (user_email);
    RAISE NOTICE '✓ claude_connections: unique constraint updated';
  END IF;
END $$;

-- Subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_clerk_user_id_key;
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_email_key UNIQUE (email);
    RAISE NOTICE '✓ subscriptions: unique constraint updated';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004 completed: Unique constraints updated';
END $$;

-- ────────────────────────────────────────────────────────────
-- FINAL VERIFICATION
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '=== All migrations completed successfully! ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy code changes to production';
  RAISE NOTICE '2. Test authentication on all environments';
  RAISE NOTICE '3. Verify same email sees same data across localhost/preview/production';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables migrated:';
END $$;

-- Show which tables were migrated
SELECT
  tablename,
  CASE
    WHEN tablename IN ('bridge_configs', 'conversations', 'chat_api_keys') THEN 'email'
    ELSE 'user_email'
  END as email_column_name
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'cloud_machines',
    'bridge_configs',
    'conversations',
    'chat_api_keys',
    'project_env_vars',
    'github_connections',
    'claude_connections',
    'subscriptions'
  )
ORDER BY tablename;
