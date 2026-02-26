-- ============================================================
-- github_connections — GitHub OAuth tokens for private repo access
-- ============================================================
-- Stores GitHub OAuth access tokens for users.
-- One connection per email address.
-- ============================================================

create table public.github_connections (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null unique,
  github_user_id          bigint not null,
  github_username         text not null,
  access_token_encrypted  text not null,
  scopes                  text not null default 'repo',
  created_at              timestamp with time zone not null default now(),
  updated_at              timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_github_connections_email on github_connections(email);

-- Row Level Security
alter table github_connections enable row level security;

create policy "Users can manage own github connections by email"
  on github_connections for all
  using (email = (select auth.jwt() ->> 'email'))
  with check (email = (select auth.jwt() ->> 'email'));

-- Auto-update updated_at
create trigger on_github_connections_updated
  before update on github_connections
  for each row
  execute function handle_updated_at();
