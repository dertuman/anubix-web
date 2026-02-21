-- ============================================================
-- subscriptions — Cached subscription state from RevenueCat
-- ============================================================
-- Kept in sync via RevenueCat webhooks.
-- API routes check this table for fast subscription verification.
--
-- Run this migration in Supabase SQL Editor.
-- Requires: handle_updated_at() function (already exists from profiles table).
-- ============================================================

create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 text not null,

  -- RevenueCat data
  revenuecat_customer_id  text,                          -- RevenueCat app_user_id (same as Clerk userId)
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
  updated_at              timestamp with time zone not null default now(),

  -- One subscription record per user
  constraint subscriptions_user_id_key unique (user_id)
);

-- Row Level Security
alter table subscriptions enable row level security;

-- Users can read their own subscription
create policy "Users can read own subscription"
  on subscriptions for select
  using (user_id = (select auth.jwt() ->> 'sub'));

-- No insert/update/delete policies for regular users.
-- Subscription data is managed exclusively by the webhook endpoint
-- and server-side helpers using createSupabaseAdmin (bypasses RLS).

-- Auto-update updated_at
create trigger on_subscriptions_updated
  before update on subscriptions
  for each row execute function handle_updated_at();

-- Indexes
create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_subscriptions_is_active on subscriptions(is_active);
create index idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);
