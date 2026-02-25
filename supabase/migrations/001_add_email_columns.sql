-- Migration: Add email columns to all tables
-- This allows us to query by email instead of Clerk user_id across environments

-- 1. bridge_configs: Add email column
ALTER TABLE bridge_configs
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. conversations: Add user_email column
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 3. chat_api_keys: Add user_email column
ALTER TABLE chat_api_keys
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 4. project_env_vars: Add user_email column
ALTER TABLE project_env_vars
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 5. github_connections: Add user_email column
ALTER TABLE github_connections
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 6. claude_connections: Add user_email column
ALTER TABLE claude_connections
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 7. subscriptions: Add email column
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS email TEXT;

-- 8. cloud_machines: Add user_email column
ALTER TABLE cloud_machines
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add indexes for performance (email will be frequently queried)
CREATE INDEX IF NOT EXISTS idx_bridge_configs_email ON bridge_configs(email);
CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON conversations(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_api_keys_user_email ON chat_api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_project_env_vars_user_email ON project_env_vars(user_email);
CREATE INDEX IF NOT EXISTS idx_github_connections_user_email ON github_connections(user_email);
CREATE INDEX IF NOT EXISTS idx_claude_connections_user_email ON claude_connections(user_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_cloud_machines_user_email ON cloud_machines(user_email);

-- Add comment to document migration
COMMENT ON COLUMN bridge_configs.email IS 'User email from Clerk - enables cross-environment auth';
COMMENT ON COLUMN conversations.user_email IS 'User email from Clerk - enables cross-environment auth';
COMMENT ON COLUMN chat_api_keys.user_email IS 'User email from Clerk - enables cross-environment auth';
COMMENT ON COLUMN project_env_vars.user_email IS 'User email from Clerk - enables cross-environment auth';
COMMENT ON COLUMN github_connections.user_email IS 'User email from Clerk - enables cross-environment auth';
COMMENT ON COLUMN claude_connections.user_email IS 'User email from Clerk - enables cross-environment auth';
COMMENT ON COLUMN subscriptions.email IS 'User email from Clerk - enables cross-environment auth';
COMMENT ON COLUMN cloud_machines.user_email IS 'User email from Clerk - enables cross-environment auth';
