-- ============================================================
-- bridge_configs — User bridge configuration storage
-- ============================================================
-- Stores bridge URL and encrypted API key for each user.
-- One config per email address.
-- ============================================================

create table public.bridge_configs (
  id uuid not null default gen_random_uuid(),
  email text not null,
  bridge_url text not null,
  api_key_encrypted text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint bridge_configs_pkey primary key (id),
  constraint bridge_configs_email_key unique (email)
) tablespace pg_default;

-- Indexes
create index if not exists idx_bridge_configs_email on bridge_configs(email);

-- Row Level Security
alter table bridge_configs enable row level security;

create policy "Users can read own config by email"
  on bridge_configs for select
  using (email = (select auth.jwt() ->> 'email'));

create policy "Users can insert own config by email"
  on bridge_configs for insert
  with check (email = (select auth.jwt() ->> 'email'));

create policy "Users can update own config by email"
  on bridge_configs for update
  using (email = (select auth.jwt() ->> 'email'));

create policy "Users can delete own config by email"
  on bridge_configs for delete
  using (email = (select auth.jwt() ->> 'email'));

-- Auto-update updated_at
create trigger on_bridge_configs_updated
  before update on bridge_configs
  for each row
  execute function handle_updated_at();
