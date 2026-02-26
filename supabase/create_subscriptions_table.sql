-- ============================================================
-- subscriptions — Cached subscription state from RevenueCat
-- ============================================================
-- Kept in sync via RevenueCat webhooks.
-- API routes check this table for fast subscription verification.
-- One subscription record per email address.
-- ============================================================

create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null unique,

  -- RevenueCat data
  revenuecat_customer_id  text,                          -- RevenueCat app_user_id
  entitlement_id          text not null default 'Anubix Pro',
  product_id              text,                          -- e.g. 'anubix_pro_monthly', 'anubix_pro_annual'
  store                   text,                          -- 'app_store', 'play_store', 'stripe'

  -- Subscription state
  is_active               boolean not null default false,
  billing_interval        text,                          -- 'monthly', 'annual', null
  current_period_start    timestamp with time zone,
  current_period_end      timestamp with time zone,      -- acts as expires_at
  auto_renew              boolean default true,
  cancellation_date       timestamp with time zone,
  unsubscribe_detected_at timestamp with time zone,

  -- Stripe-specific (for web management)
  stripe_customer_id      text,
  stripe_subscription_id  text,

  -- Metadata
  last_webhook_at         timestamp with time zone,      -- when we last got a webhook for this user
  last_api_check_at       timestamp with time zone,      -- when we last called RevenueCat API directly
  raw_webhook_event       jsonb,                         -- latest webhook payload for debugging

  created_at              timestamp with time zone not null default now(),
  updated_at              timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_subscriptions_email on subscriptions(email);
create index if not exists idx_subscriptions_is_active on subscriptions(is_active);
create index if not exists idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);

-- Row Level Security
alter table subscriptions enable row level security;

-- Users can read their own subscription
create policy "Users can read own subscription by email"
  on subscriptions for select
  using (email = (select auth.jwt() ->> 'email'));

-- No insert/update/delete policies for regular users.
-- Subscription data is managed exclusively by the webhook endpoint
-- and server-side helpers using createSupabaseAdmin (bypasses RLS).

-- Auto-update updated_at
create trigger on_subscriptions_updated
  before update on subscriptions
  for each row
  execute function handle_updated_at();
