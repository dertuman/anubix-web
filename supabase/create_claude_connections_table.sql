-- ============================================================
-- claude_connections — Claude credentials storage
-- ============================================================
-- Stores encrypted Claude CLI credentials or API keys.
-- Users only need to set up once, not every provision.
-- One connection per email address.
-- ============================================================

create table public.claude_connections (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique,
  claude_mode         text not null default 'cli',
  auth_json_encrypted text,       -- for CLI mode (credentials.json contents)
  api_key_encrypted   text,       -- for SDK mode (sk-ant-...)
  created_at          timestamp with time zone not null default now(),
  updated_at          timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_claude_connections_email on claude_connections(email);

-- Row Level Security
alter table claude_connections enable row level security;

create policy "Users can manage own claude connections by email"
  on claude_connections for all
  using (email = (select auth.jwt() ->> 'email'))
  with check (email = (select auth.jwt() ->> 'email'));

-- Auto-update updated_at
create trigger on_claude_connections_updated
  before update on claude_connections
  for each row
  execute function handle_updated_at();
