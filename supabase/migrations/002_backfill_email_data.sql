-- Migration: Backfill email data from profiles table
-- Populates the new email columns with data from existing user_id/clerk_user_id mappings

-- 1. bridge_configs: Backfill email from profiles
UPDATE bridge_configs bc
SET email = p.email
FROM profiles p
WHERE bc.user_id = p.id
AND bc.email IS NULL;

-- 2. conversations: Backfill user_email from profiles
UPDATE conversations c
SET user_email = p.email
FROM profiles p
WHERE c.user_id = p.id
AND c.user_email IS NULL;

-- 3. chat_api_keys: Backfill user_email from profiles
UPDATE chat_api_keys cak
SET user_email = p.email
FROM profiles p
WHERE cak.user_id = p.id
AND cak.user_email IS NULL;

-- 4. project_env_vars: Backfill user_email from profiles
UPDATE project_env_vars pev
SET user_email = p.email
FROM profiles p
WHERE pev.user_id = p.id
AND pev.user_email IS NULL;

-- 5. github_connections: Backfill user_email from profiles
UPDATE github_connections gc
SET user_email = p.email
FROM profiles p
WHERE gc.user_id = p.id
AND gc.user_email IS NULL;

-- 6. claude_connections: Backfill user_email from profiles
UPDATE claude_connections cc
SET user_email = p.email
FROM profiles p
WHERE cc.user_id = p.id
AND cc.user_email IS NULL;

-- 7. subscriptions: Backfill email from profiles
UPDATE subscriptions s
SET email = p.email
FROM profiles p
WHERE s.clerk_user_id = p.id
AND s.email IS NULL;

-- 8. cloud_machines: Backfill user_email from profiles
UPDATE cloud_machines cm
SET user_email = p.email
FROM profiles p
WHERE cm.user_id = p.id
AND cm.user_email IS NULL;

-- Verification queries (uncomment to run checks)
-- SELECT COUNT(*) as total, COUNT(email) as with_email FROM bridge_configs;
-- SELECT COUNT(*) as total, COUNT(user_email) as with_email FROM conversations;
-- SELECT COUNT(*) as total, COUNT(user_email) as with_email FROM chat_api_keys;
-- SELECT COUNT(*) as total, COUNT(user_email) as with_email FROM project_env_vars;
-- SELECT COUNT(*) as total, COUNT(user_email) as with_email FROM github_connections;
-- SELECT COUNT(*) as total, COUNT(user_email) as with_email FROM claude_connections;
-- SELECT COUNT(*) as total, COUNT(email) as with_email FROM subscriptions;
-- SELECT COUNT(*) as total, COUNT(user_email) as with_email FROM cloud_machines;
