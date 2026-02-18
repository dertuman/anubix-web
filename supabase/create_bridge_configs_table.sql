create table public.bridge_configs (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  bridge_url text not null,
  api_key_encrypted text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint bridge_configs_pkey primary key (id),
  constraint bridge_configs_user_id_key unique (user_id)
) TABLESPACE pg_default;

alter table bridge_configs enable row level security;

create policy "Users can read own config"
  on bridge_configs for select
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "Users can insert own config"
  on bridge_configs for insert
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "Users can update own config"
  on bridge_configs for update
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "Users can delete own config"
  on bridge_configs for delete
  using (user_id = (select auth.jwt() ->> 'sub'));

create trigger on_bridge_configs_updated before
update on bridge_configs for each row
execute function handle_updated_at ();
