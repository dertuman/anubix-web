-- ============================================================
-- project_env_vars — User environment variables for cloud workspaces
-- ============================================================
-- Stores encrypted environment variables per user per repo.
-- Multiple values per user, one per (email, repo_path, key) combination.
-- ============================================================

create table public.project_env_vars (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  key               text not null,
  value_encrypted   text not null,
  repo_path         text not null default '__global__',
  created_at        timestamp with time zone not null default now(),
  updated_at        timestamp with time zone not null default now(),

  -- One value per key per user per repo
  constraint project_env_vars_email_repo_key_key unique (email, repo_path, key)
);

-- Indexes
create index if not exists idx_project_env_vars_email on project_env_vars(email);

-- Row Level Security
alter table project_env_vars enable row level security;

create policy "Users can manage own env vars by email"
  on project_env_vars for all
  using (email = (select auth.jwt() ->> 'email'))
  with check (email = (select auth.jwt() ->> 'email'));

-- Auto-update updated_at
create trigger on_project_env_vars_updated
  before update on project_env_vars
  for each row
  execute function handle_updated_at();
