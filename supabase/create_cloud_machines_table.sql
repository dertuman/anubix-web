-- ============================================================
-- cloud_machines — One Fly.io machine per user
-- ============================================================
-- Stores cloud workspace machine state and configuration.
-- One machine per email address.
-- ============================================================

-- Status lifecycle: provisioning -> starting -> running -> stopping -> stopped -> destroying -> destroyed
--                   Any state can transition to 'error'
create type if not exists public.machine_status as enum (
  'provisioning',
  'starting',
  'running',
  'stopping',
  'stopped',
  'destroying',
  'destroyed',
  'error'
);

create table public.cloud_machines (
  id                          uuid primary key default gen_random_uuid(),
  email                       text not null unique,

  -- Fly.io resource identifiers
  fly_app_name                text not null unique,
  fly_machine_id              text,
  fly_volume_id               text,
  fly_region                  text not null default 'lhr',

  -- Bridge connection (encrypted with lib/encryption.ts AES-256-GCM)
  bridge_url                  text,
  bridge_api_key_encrypted    text,

  -- Claude auth — one of these two, depending on claude_mode
  claude_mode                 text not null default 'cli',    -- 'cli' (subscription) or 'sdk' (API key)
  claude_auth_json_encrypted  text,                           -- cli mode: contents of auth.json
  anthropic_api_key_encrypted text,                           -- sdk mode: API key

  -- Machine state
  status                      machine_status not null default 'provisioning',
  error_message               text,

  -- Configuration
  template_name               text,                           -- 'nextjs', 'vite-react', 'vanilla', or null
  git_repo_url                text,
  vm_size                     text not null default 'shared-cpu-1x',
  memory_mb                   integer not null default 512,
  volume_size_gb              integer not null default 1,

  -- Timestamps
  last_health_check_at        timestamp with time zone,
  stopped_at                  timestamp with time zone,
  created_at                  timestamp with time zone not null default now(),
  updated_at                  timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_cloud_machines_status on cloud_machines(status);
create index if not exists idx_cloud_machines_email on cloud_machines(email);

-- Row Level Security
alter table cloud_machines enable row level security;

create policy "Users can manage own machines by email"
  on cloud_machines for all
  using (email = (select auth.jwt() ->> 'email'))
  with check (email = (select auth.jwt() ->> 'email'));

-- Auto-update updated_at
create trigger on_cloud_machines_updated
  before update on cloud_machines
  for each row
  execute function handle_updated_at();
