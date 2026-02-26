-- ============================================================
-- Chat Web Migration
-- ============================================================
-- Extends the existing chat tables (created by anubix-native) with web-specific columns.
-- IMPORTANT: This is safe to run multiple times (idempotent with IF NOT EXISTS).
-- ============================================================

-- =============================================================================
-- EXTEND MESSAGES TABLE
-- =============================================================================

-- Rich file attachments: [{"name":"file.pdf","mimeType":"application/pdf","size":1234,"category":"pdf"}]
alter table messages add column if not exists files jsonb default null;

-- Which AI model generated this response (assistant messages only)
alter table messages add column if not exists model text default null;

-- =============================================================================
-- EXTEND CONVERSATIONS TABLE
-- =============================================================================

-- Sharing support
alter table conversations add column if not exists is_shared boolean default false;
alter table conversations add column if not exists share_id text unique;

-- =============================================================================
-- PER-USER ENCRYPTED API KEYS
-- =============================================================================

create table if not exists chat_api_keys (
  id uuid primary key default gen_random_uuid(),

  -- User identifier (email address)
  email text not null,

  -- Provider: openai, google, anthropic
  provider text not null check (provider in ('openai', 'google', 'anthropic')),

  -- AES-256-GCM encrypted key components
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,

  -- Timestamps
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  -- One key per provider per user
  unique(email, provider)
);

-- Auto-update updated_at
create or replace function update_chat_api_keys_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_chat_api_keys_updated_at on chat_api_keys;
create trigger update_chat_api_keys_updated_at
  before update on chat_api_keys
  for each row
  execute function update_chat_api_keys_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table chat_api_keys enable row level security;

-- Users can manage their own API keys
drop policy if exists "Users can manage own api keys by email" on chat_api_keys;
create policy "Users can manage own api keys by email"
  on chat_api_keys for all
  using (email = (select auth.jwt() ->> 'email'))
  with check (email = (select auth.jwt() ->> 'email'));

-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_chat_api_keys_email on chat_api_keys(email);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

select
  '✅ Chat web migration complete!' as status,
  (select count(*) from information_schema.columns where table_name = 'messages' and column_name = 'files') as messages_files_col,
  (select count(*) from information_schema.columns where table_name = 'messages' and column_name = 'model') as messages_model_col,
  (select count(*) from information_schema.columns where table_name = 'conversations' and column_name = 'is_shared') as conversations_is_shared_col,
  (select count(*) from information_schema.columns where table_name = 'conversations' and column_name = 'share_id') as conversations_share_id_col,
  (select count(*) from information_schema.tables where table_name = 'chat_api_keys') as chat_api_keys_table;
