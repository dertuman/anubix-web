-- ============================================================
-- RENAME user_email → email ON ALL TABLES
-- ============================================================
--
-- Standardizes the email column name across all tables.
-- Also makes clerk_user_id and user_id nullable everywhere
-- since email is the primary identifier.
--
-- Tables affected:
--   cloud_machines      : user_email → email
--   claude_connections   : user_email → email
--   github_connections   : user_email → email
--   project_env_vars     : user_email → email
--
-- Tables already using email (no change needed):
--   bridge_configs, conversations, chat_api_keys, profiles, subscriptions
--
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1: Rename user_email → email on 4 tables
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- cloud_machines
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cloud_machines' AND column_name = 'user_email'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'cloud_machines' AND column_name = 'email'
    ) THEN
      ALTER TABLE cloud_machines RENAME COLUMN user_email TO email;
      RAISE NOTICE '✓ cloud_machines: renamed user_email → email';
    ELSE
      UPDATE cloud_machines SET email = user_email WHERE email IS NULL AND user_email IS NOT NULL;
      ALTER TABLE cloud_machines DROP COLUMN user_email;
      RAISE NOTICE '✓ cloud_machines: merged user_email into email, dropped user_email';
    END IF;
  ELSE
    RAISE NOTICE '✓ cloud_machines: already uses email';
  END IF;

  -- claude_connections
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claude_connections' AND column_name = 'user_email'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'claude_connections' AND column_name = 'email'
    ) THEN
      ALTER TABLE claude_connections RENAME COLUMN user_email TO email;
      RAISE NOTICE '✓ claude_connections: renamed user_email → email';
    ELSE
      UPDATE claude_connections SET email = user_email WHERE email IS NULL AND user_email IS NOT NULL;
      ALTER TABLE claude_connections DROP COLUMN user_email;
      RAISE NOTICE '✓ claude_connections: merged user_email into email, dropped user_email';
    END IF;
  ELSE
    RAISE NOTICE '✓ claude_connections: already uses email';
  END IF;

  -- github_connections
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'github_connections' AND column_name = 'user_email'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'github_connections' AND column_name = 'email'
    ) THEN
      ALTER TABLE github_connections RENAME COLUMN user_email TO email;
      RAISE NOTICE '✓ github_connections: renamed user_email → email';
    ELSE
      UPDATE github_connections SET email = user_email WHERE email IS NULL AND user_email IS NOT NULL;
      ALTER TABLE github_connections DROP COLUMN user_email;
      RAISE NOTICE '✓ github_connections: merged user_email into email, dropped user_email';
    END IF;
  ELSE
    RAISE NOTICE '✓ github_connections: already uses email';
  END IF;

  -- project_env_vars
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_env_vars' AND column_name = 'user_email'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_env_vars' AND column_name = 'email'
    ) THEN
      ALTER TABLE project_env_vars RENAME COLUMN user_email TO email;
      RAISE NOTICE '✓ project_env_vars: renamed user_email → email';
    ELSE
      UPDATE project_env_vars SET email = user_email WHERE email IS NULL AND user_email IS NOT NULL;
      ALTER TABLE project_env_vars DROP COLUMN user_email;
      RAISE NOTICE '✓ project_env_vars: merged user_email into email, dropped user_email';
    END IF;
  ELSE
    RAISE NOTICE '✓ project_env_vars: already uses email';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 2: Make clerk_user_id and user_id nullable where they exist
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('user_id', 'clerk_user_id')
      AND is_nullable = 'NO'
      AND table_name IN (
        'conversations', 'chat_api_keys', 'bridge_configs',
        'cloud_machines', 'claude_connections', 'github_connections',
        'project_env_vars', 'subscriptions'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL', col.table_name, col.column_name);
    RAISE NOTICE '✓ Made %.% nullable', col.table_name, col.column_name;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 3: Create indexes on new email columns
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cloud_machines_email ON cloud_machines(email);
CREATE INDEX IF NOT EXISTS idx_claude_connections_email ON claude_connections(email);
CREATE INDEX IF NOT EXISTS idx_github_connections_email ON github_connections(email);
CREATE INDEX IF NOT EXISTS idx_project_env_vars_email ON project_env_vars(email);

DO $$ BEGIN RAISE NOTICE '✓ Created indexes on email columns'; END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 4: Update unique constraints to use email
-- ────────────────────────────────────────────────────────────

-- claude_connections: unique on email (one connection per user)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claude_connections_user_email_key') THEN
    ALTER TABLE claude_connections DROP CONSTRAINT claude_connections_user_email_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claude_connections_email_key') THEN
    ALTER TABLE claude_connections ADD CONSTRAINT claude_connections_email_key UNIQUE (email);
  END IF;
  RAISE NOTICE '✓ Updated claude_connections unique constraint';
END $$;

-- github_connections: unique on email
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'github_connections_user_email_key') THEN
    ALTER TABLE github_connections DROP CONSTRAINT github_connections_user_email_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'github_connections_email_key') THEN
    ALTER TABLE github_connections ADD CONSTRAINT github_connections_email_key UNIQUE (email);
  END IF;
  RAISE NOTICE '✓ Updated github_connections unique constraint';
END $$;

-- project_env_vars: unique on (email, repo_path, key)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_env_vars_user_email_repo_path_key_key') THEN
    ALTER TABLE project_env_vars DROP CONSTRAINT project_env_vars_user_email_repo_path_key_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_env_vars_email_repo_path_key_key') THEN
    ALTER TABLE project_env_vars ADD CONSTRAINT project_env_vars_email_repo_path_key_key UNIQUE (email, repo_path, key);
  END IF;
  RAISE NOTICE '✓ Updated project_env_vars unique constraint';
END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 5: Update RLS policies to use email
-- ────────────────────────────────────────────────────────────

-- cloud_machines
DROP POLICY IF EXISTS "Users can manage own machines" ON cloud_machines;
DROP POLICY IF EXISTS "Users can manage own machines by email" ON cloud_machines;
CREATE POLICY "Users can manage own machines by email"
  ON cloud_machines FOR ALL
  USING (email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

-- claude_connections
DROP POLICY IF EXISTS "Users can manage own claude connections" ON claude_connections;
DROP POLICY IF EXISTS "Users can manage own claude connections by email" ON claude_connections;
CREATE POLICY "Users can manage own claude connections by email"
  ON claude_connections FOR ALL
  USING (email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

-- github_connections
DROP POLICY IF EXISTS "Users can manage own github connections" ON github_connections;
DROP POLICY IF EXISTS "Users can manage own github connections by email" ON github_connections;
CREATE POLICY "Users can manage own github connections by email"
  ON github_connections FOR ALL
  USING (email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

-- project_env_vars
DROP POLICY IF EXISTS "Users can manage own env vars" ON project_env_vars;
DROP POLICY IF EXISTS "Users can manage own env vars by email" ON project_env_vars;
CREATE POLICY "Users can manage own env vars by email"
  ON project_env_vars FOR ALL
  USING (email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

DO $$ BEGIN RAISE NOTICE '✓ Updated RLS policies'; END $$;

-- ────────────────────────────────────────────────────────────
-- VERIFICATION
-- ────────────────────────────────────────────────────────────

SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('email', 'user_email')
  AND table_name IN (
    'cloud_machines', 'claude_connections', 'github_connections',
    'project_env_vars', 'bridge_configs', 'conversations',
    'chat_api_keys', 'profiles', 'subscriptions'
  )
ORDER BY table_name, column_name;
