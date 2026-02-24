import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

/**
 * POST /api/webhooks/revenuecat
 *
 * Handles RevenueCat webhook events to sync subscription state.
 *
 * Webhook events documentation: https://www.revenuecat.com/docs/webhooks
 *
 * Key events we handle:
 * - INITIAL_PURCHASE: User subscribes for the first time
 * - RENEWAL: Subscription renews
 * - CANCELLATION: User cancels (but subscription remains active until period end)
 * - EXPIRATION: Subscription expires (set is_active = false)
 * - BILLING_ISSUE: Payment failed
 * - UNCANCELLATION: User reactivates cancelled subscription
 * - PRODUCT_CHANGE: User switches plans (e.g. monthly → annual)
 */
export async function POST(req: NextRequest) {
  // ── Verify webhook signature ─────────────────────────────
  const authHeader = req.headers.get('authorization');
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    console.warn('RevenueCat webhook: Invalid authorization header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // ── Extract webhook data ──────────────────────────────────
  const userId = event.app_user_id as string | undefined; // RevenueCat app_user_id = Clerk userId
  const eventType = event.type as string | undefined;
  const subscriber = (event.subscriber as Record<string, unknown> | undefined) || {};
  const entitlements = (subscriber.entitlements as Record<string, unknown> | undefined) || {};
  const subscriptions = (subscriber.subscriptions as Record<string, unknown> | undefined) || {};

  if (!userId) {
    console.warn('RevenueCat webhook: Missing app_user_id', { eventType });
    return NextResponse.json({ received: true }); // Acknowledge but don't process
  }

  console.log(`📥 RevenueCat webhook: ${eventType} for user ${userId}`);

  // ── Determine subscription state ──────────────────────────
  // Check the "Anubix Pro" entitlement (case-insensitive)
  const proEntitlement = (entitlements['Anubix Pro'] || entitlements['anubix_pro']) as Record<string, unknown> | undefined;

  // Subscription is active if entitlement hasn't expired
  const expiresDate = proEntitlement?.expires_date as string | undefined;
  const isActive = expiresDate
    ? new Date(expiresDate) > new Date()
    : false;

  // Find the most recent active subscription to get details
  let productId: string | null = null;
  let billingInterval: string | null = null;
  let currentPeriodStart: string | null = null;
  let currentPeriodEnd: string | null = null;
  let autoRenew = true;
  let store: string | null = null;
  let unsubscribeDetectedAt: string | null = null;

  // Iterate through all subscriptions to find active one
  for (const [key, sub] of Object.entries(subscriptions)) {
    const subData = sub as Record<string, unknown>;

    // Check if this subscription is still valid
    const subExpiresDate = subData.expires_date as string | undefined;
    if (subExpiresDate && new Date(subExpiresDate) > new Date()) {
      productId = key;
      currentPeriodEnd = subExpiresDate;
      currentPeriodStart = (subData.purchase_date as string | undefined) || (subData.original_purchase_date as string | undefined) || null;
      unsubscribeDetectedAt = (subData.unsubscribe_detected_at as string | undefined) || null;
      autoRenew = !unsubscribeDetectedAt;
      store = (subData.store as string | undefined) || null;

      // Infer billing interval from product_id
      // Assumes product IDs follow naming convention: anubix_pro_monthly, anubix_pro_annual
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('monthly')) {
        billingInterval = 'monthly';
      } else if (lowerKey.includes('annual') || lowerKey.includes('yearly')) {
        billingInterval = 'annual';
      }

      break; // Use first active subscription found
    }
  }

  // ── Sync to database (admin client bypasses RLS) ─────────
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    console.error('RevenueCat webhook: Supabase admin client not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId as string,
        revenuecat_customer_id: userId as string,
        entitlement_id: 'Anubix Pro',
        product_id: productId,
        store,
        is_active: isActive,
        billing_interval: billingInterval,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        auto_renew: autoRenew,
        unsubscribe_detected_at: unsubscribeDetectedAt,
        last_webhook_at: new Date().toISOString(),
        raw_webhook_event: event as unknown as Json, // Store full payload for debugging
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' } // Update existing record if user already has subscription
    );

  if (upsertError) {
    console.error('RevenueCat webhook: Failed to upsert subscription', {
      userId,
      error: upsertError.message,
    });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  console.log(`✅ Synced subscription for user ${userId}: ${eventType} (active: ${isActive}, interval: ${billingInterval})`);

  return NextResponse.json({ received: true });
}
