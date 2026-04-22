-- ============================================================
-- ALTER script: add local-bridge columns to existing bridge_configs
-- ============================================================
-- Run this in your Supabase SQL Editor if you already have the
-- bridge_configs table from the original schema. For fresh installs,
-- just run create_bridge_configs_table.sql directly.
-- ============================================================

-- Drop NOT NULL on bridge_url (unknown until the bridge self-registers)
alter table public.bridge_configs
  alter column bridge_url drop not null;

-- Install token hash (sha256 hex of the plaintext token)
alter table public.bridge_configs
  add column if not exists install_token_hash text;

-- Presence/heartbeat
alter table public.bridge_configs
  add column if not exists last_seen_at timestamp with time zone;

-- Unique on install_token_hash (so /api/bridge-register can look up by it)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bridge_configs_install_token_hash_key'
  ) then
    alter table public.bridge_configs
      add constraint bridge_configs_install_token_hash_key unique (install_token_hash);
  end if;
end$$;

create index if not exists idx_bridge_configs_install_token_hash
  on public.bridge_configs(install_token_hash);
