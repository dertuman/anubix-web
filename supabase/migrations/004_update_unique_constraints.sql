-- Migration: Update unique constraints to use email instead of user_id
-- This ensures one record per email (instead of one per Clerk user_id)

-- ============================================================
-- 1. cloud_machines - One machine per email
-- ============================================================

-- Drop old constraint
ALTER TABLE cloud_machines
DROP CONSTRAINT IF EXISTS cloud_machines_user_id_key;

-- Add new email-based constraint
ALTER TABLE cloud_machines
ADD CONSTRAINT cloud_machines_user_email_key UNIQUE (user_email);

-- ============================================================
-- 2. bridge_configs - One config per email
-- ============================================================

-- Drop old constraint (if exists)
ALTER TABLE bridge_configs
DROP CONSTRAINT IF EXISTS bridge_configs_user_id_key;

-- Add new email-based constraint
ALTER TABLE bridge_configs
ADD CONSTRAINT bridge_configs_email_key UNIQUE (email);

-- ============================================================
-- 3. github_connections - One GitHub account per email
-- ============================================================

-- Drop old constraint (if exists)
ALTER TABLE github_connections
DROP CONSTRAINT IF EXISTS github_connections_user_id_key;

-- Add new email-based constraint
ALTER TABLE github_connections
ADD CONSTRAINT github_connections_user_email_key UNIQUE (user_email);

-- ============================================================
-- 4. claude_connections - One Claude account per email
-- ============================================================

-- Drop old constraint (if exists)
ALTER TABLE claude_connections
DROP CONSTRAINT IF EXISTS claude_connections_user_id_key;

-- Add new email-based constraint
ALTER TABLE claude_connections
ADD CONSTRAINT claude_connections_user_email_key UNIQUE (user_email);

-- ============================================================
-- 5. subscriptions - One subscription per email
-- ============================================================

-- Drop old constraint (if exists)
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_clerk_user_id_key;

-- Add new email-based constraint
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_email_key UNIQUE (email);

-- ============================================================
-- Note: conversations, chat_api_keys, project_env_vars
-- do not have unique constraints on user_id
-- (users can have multiple conversations, API keys, env vars)
-- ============================================================

-- Verification: Check that constraints were created
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%email%'
  AND contype = 'u'
  AND conrelid::regclass::text IN (
    'cloud_machines',
    'bridge_configs',
    'github_connections',
    'claude_connections',
    'subscriptions'
  )
ORDER BY table_name, constraint_name;
