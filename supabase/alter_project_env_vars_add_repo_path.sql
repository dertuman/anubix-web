-- ============================================================
-- Alter project_env_vars — Add repo_path for per-repo env vars
-- ============================================================
-- Run this migration in Supabase SQL Editor AFTER
-- create_project_env_vars_table.sql has already been applied.
-- ============================================================

-- Add repo_path column with default '__global__' for existing rows
ALTER TABLE project_env_vars
  ADD COLUMN IF NOT EXISTS repo_path text NOT NULL DEFAULT '__global__';

-- Drop old unique constraint (user_id, key)
ALTER TABLE project_env_vars
  DROP CONSTRAINT IF EXISTS project_env_vars_user_key;

-- New unique constraint scoped by repo
ALTER TABLE project_env_vars
  ADD CONSTRAINT project_env_vars_user_repo_key UNIQUE (user_id, repo_path, key);
