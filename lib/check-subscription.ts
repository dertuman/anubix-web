import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

type Sb = SupabaseClient<Database>;

export type SubscriptionCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Check whether a user may provision / start a cloud environment.
 *
 * 1. Admins (`profiles.is_admin = true`) bypass the subscription check entirely.
 * 2. Otherwise the user must have an active subscription with a valid billing interval.
 */
export async function checkSubscriptionOrAdmin(
  sb: Sb,
  email: string,
): Promise<SubscriptionCheckResult> {
  // 1. Admin bypass
  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('email', email)
    .single();

  if (profile?.is_admin) {
    return { allowed: true };
  }

  // 2. Subscription check
  const { data: subscription } = await sb
    .from('subscriptions')
    .select('is_active, billing_interval')
    .eq('email', email)
    .single();

  if (!subscription || !subscription.is_active) {
    return {
      allowed: false,
      reason: 'Active subscription required. Please subscribe to use cloud environments.',
    };
  }

  if (
    !subscription.billing_interval ||
    !['monthly', 'annual'].includes(subscription.billing_interval)
  ) {
    return {
      allowed: false,
      reason: 'Valid subscription plan required (monthly or annual).',
    };
  }

  return { allowed: true };
}
