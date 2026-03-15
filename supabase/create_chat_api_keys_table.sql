-- ============================================================
-- chat_api_keys — Per-user encrypted API keys for AI providers
-- ============================================================
-- Stores AES-256-GCM encrypted API keys for OpenAI, Google AI,
-- and Anthropic. One key per provider per user.
-- ============================================================

create table public.chat_api_keys (
  id uuid not null default gen_random_uuid(),
  clerk_user_id text null,
  provider text not null,
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  email text null,
  constraint chat_api_keys_pkey primary key (id),
  constraint chat_api_keys_clerk_user_id_provider_key unique (clerk_user_id, provider),
  constraint chat_api_keys_email_provider_key unique (email, provider),
  constraint chat_api_keys_provider_check check (
    (
      provider = any (
        array['openai'::text, 'google'::text, 'anthropic'::text]
      )
    )
  )
) tablespace pg_default;

-- Indexes
create index if not exists idx_chat_api_keys_user on chat_api_keys using btree (clerk_user_id);
create index if not exists idx_chat_api_keys_email on chat_api_keys using btree (email);

-- Row Level Security
alter table chat_api_keys enable row level security;

create policy "Users can read own api keys by email"
  on chat_api_keys for select
  using (email = (select auth.jwt() ->> 'email'));

create policy "Users can insert own api keys by email"
  on chat_api_keys for insert
  with check (email = (select auth.jwt() ->> 'email'));

create policy "Users can update own api keys by email"
  on chat_api_keys for update
  using (email = (select auth.jwt() ->> 'email'));

create policy "Users can delete own api keys by email"
  on chat_api_keys for delete
  using (email = (select auth.jwt() ->> 'email'));

-- Auto-update updated_at
create trigger update_chat_api_keys_updated_at
  before update on chat_api_keys
  for each row
  execute function update_chat_api_keys_updated_at();
