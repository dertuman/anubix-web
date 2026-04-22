-- ============================================================
-- bridge_configs — User bridge configuration storage
-- ============================================================
-- Stores local-bridge credentials per user.
--
-- Flow:
--   1. User clicks "Connect my computer" in the web UI.
--   2. Web generates (install_token, bridge_api_key), stores install_token_hash
--      and the encrypted bridge_api_key here, shows both to the user once.
--   3. User pastes them into the bridge's .env and starts the bridge.
--   4. Bridge opens a Cloudflare Quick Tunnel and POSTs its public URL to
--      /api/bridge-register authenticated with the install token.
--   5. /api/bridge-register populates bridge_url and last_seen_at.
--   6. Web/native clients read bridge_url + decrypted bridge_api_key and
--      connect to the bridge directly.
--
-- One config per email address.
-- ============================================================

create table public.bridge_configs (
  id uuid not null default gen_random_uuid(),
  email text not null,
  -- Public tunnel URL (e.g. https://foo.trycloudflare.com). Null until the
  -- bridge first registers itself.
  bridge_url text,
  -- Bridge API key, encrypted. Clients send it as x-api-key to the bridge.
  api_key_encrypted text not null,
  -- sha256 hash of the install token (hex). The bridge sends the plaintext
  -- token when calling /api/bridge-register; we hash and match.
  install_token_hash text,
  -- Last time the bridge successfully registered or heartbeated.
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint bridge_configs_pkey primary key (id),
  constraint bridge_configs_email_key unique (email),
  constraint bridge_configs_install_token_hash_key unique (install_token_hash)
) tablespace pg_default;

-- Indexes
create index if not exists idx_bridge_configs_email on bridge_configs(email);
create index if not exists idx_bridge_configs_install_token_hash on bridge_configs(install_token_hash);

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

-- Note: /api/bridge-register uses the service-role admin client to bypass RLS,
-- since the bridge authenticates with an install token, not a Clerk JWT.

-- Auto-update updated_at
create trigger on_bridge_configs_updated
  before update on bridge_configs
  for each row
  execute function handle_updated_at();
