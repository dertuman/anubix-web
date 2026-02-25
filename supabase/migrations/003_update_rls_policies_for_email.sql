-- Migration: Update RLS policies to use email instead of user_id
-- This allows the same email to access data across different Clerk instances
-- REQUIRES: Clerk JWT template updated to include email claim

-- ============================================================
-- 1. cloud_machines
-- ============================================================

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

-- ============================================================
-- 2. bridge_configs
-- ============================================================

DROP POLICY IF EXISTS "Users can read own config" ON bridge_configs;
DROP POLICY IF EXISTS "Users can insert own config" ON bridge_configs;
DROP POLICY IF EXISTS "Users can update own config" ON bridge_configs;
DROP POLICY IF EXISTS "Users can delete own config" ON bridge_configs;

CREATE POLICY "Users can read own config by email"
  ON bridge_configs FOR SELECT
  USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own config by email"
  ON bridge_configs FOR INSERT
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own config by email"
  ON bridge_configs FOR UPDATE
  USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own config by email"
  ON bridge_configs FOR DELETE
  USING (email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- 3. conversations
-- ============================================================

DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

CREATE POLICY "Users can read own conversations by email"
  ON conversations FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own conversations by email"
  ON conversations FOR INSERT
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own conversations by email"
  ON conversations FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own conversations by email"
  ON conversations FOR DELETE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- 4. chat_api_keys
-- ============================================================

DROP POLICY IF EXISTS "Users can read own api keys" ON chat_api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON chat_api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON chat_api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON chat_api_keys;

CREATE POLICY "Users can read own api keys by email"
  ON chat_api_keys FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own api keys by email"
  ON chat_api_keys FOR INSERT
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own api keys by email"
  ON chat_api_keys FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own api keys by email"
  ON chat_api_keys FOR DELETE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- 5. project_env_vars
-- ============================================================

DROP POLICY IF EXISTS "Users can read own env vars" ON project_env_vars;
DROP POLICY IF EXISTS "Users can insert own env vars" ON project_env_vars;
DROP POLICY IF EXISTS "Users can update own env vars" ON project_env_vars;
DROP POLICY IF EXISTS "Users can delete own env vars" ON project_env_vars;

CREATE POLICY "Users can read own env vars by email"
  ON project_env_vars FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own env vars by email"
  ON project_env_vars FOR INSERT
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own env vars by email"
  ON project_env_vars FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own env vars by email"
  ON project_env_vars FOR DELETE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- 6. github_connections
-- ============================================================

DROP POLICY IF EXISTS "Users can read own github connections" ON github_connections;
DROP POLICY IF EXISTS "Users can insert own github connections" ON github_connections;
DROP POLICY IF EXISTS "Users can update own github connections" ON github_connections;
DROP POLICY IF EXISTS "Users can delete own github connections" ON github_connections;

CREATE POLICY "Users can read own github connections by email"
  ON github_connections FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own github connections by email"
  ON github_connections FOR INSERT
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own github connections by email"
  ON github_connections FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own github connections by email"
  ON github_connections FOR DELETE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- 7. claude_connections
-- ============================================================

DROP POLICY IF EXISTS "Users can read own claude connections" ON claude_connections;
DROP POLICY IF EXISTS "Users can insert own claude connections" ON claude_connections;
DROP POLICY IF EXISTS "Users can update own claude connections" ON claude_connections;
DROP POLICY IF EXISTS "Users can delete own claude connections" ON claude_connections;

CREATE POLICY "Users can read own claude connections by email"
  ON claude_connections FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own claude connections by email"
  ON claude_connections FOR INSERT
  WITH CHECK (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own claude connections by email"
  ON claude_connections FOR UPDATE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own claude connections by email"
  ON claude_connections FOR DELETE
  USING (user_email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- 8. subscriptions
-- ============================================================

DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON subscriptions;

CREATE POLICY "Users can read own subscription by email"
  ON subscriptions FOR SELECT
  USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own subscription by email"
  ON subscriptions FOR INSERT
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own subscription by email"
  ON subscriptions FOR UPDATE
  USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own subscription by email"
  ON subscriptions FOR DELETE
  USING (email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- 9. profiles (update to use email as well)
-- ============================================================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile by email"
  ON profiles FOR SELECT
  USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own profile by email"
  ON profiles FOR INSERT
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own profile by email"
  ON profiles FOR UPDATE
  USING (email = (SELECT auth.jwt() ->> 'email'));
