-- ============================================================
-- github_connections — GitHub OAuth tokens for private repo access
-- ============================================================
-- Run this migration in Supabase SQL Editor.
-- Requires: handle_updated_at() function (already exists from profiles table).
-- ============================================================

create table public.github_connections (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 text not null unique,
  github_user_id          bigint not null,
  github_username         text not null,
  access_token_encrypted  text not null,
  scopes                  text not null default 'repo',
  created_at              timestamp with time zone not null default now(),
  updated_at              timestamp with time zone not null default now()
);

-- Row Level Security
alter table github_connections enable row level security;

create policy "Users manage own GitHub connection"
  on github_connections for all
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));

-- Auto-update updated_at
create trigger on_github_connections_updated
  before update on github_connections
  for each row execute function handle_updated_at();

-- Indexes
create index idx_github_connections_user_id on github_connections(user_id);
