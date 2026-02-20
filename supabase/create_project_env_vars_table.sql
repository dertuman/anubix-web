-- ============================================================
-- project_env_vars — User environment variables for cloud workspaces
-- ============================================================
-- Run this migration in Supabase SQL Editor.
-- Requires: handle_updated_at() function (already exists from profiles table).
-- ============================================================

create table public.project_env_vars (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  key               text not null,
  value_encrypted   text not null,
  repo_path         text not null default '__global__',
  created_at        timestamp with time zone not null default now(),
  updated_at        timestamp with time zone not null default now(),

  -- One value per key per user per repo
  constraint project_env_vars_user_repo_key unique (user_id, repo_path, key)
);

-- Row Level Security
alter table project_env_vars enable row level security;

create policy "Users manage own env vars"
  on project_env_vars for all
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

-- Auto-update updated_at
create trigger on_project_env_vars_updated
  before update on project_env_vars
  for each row execute function handle_updated_at();

-- Indexes
create index idx_project_env_vars_user_id on project_env_vars(user_id);
