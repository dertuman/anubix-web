# Subscription Gating Implementation Guide

## ✅ Implementation Complete

This guide documents the subscription-based access control for Fly.io machine provisioning.

---

## 📋 What Was Implemented

### 1. Subscription Check in Provision Endpoint
**File:** `/workspace/anubix-web/app/api/cloud/provision/route.ts`

Added subscription validation at line 73-93 that:
- Checks if user has an active subscription in the `subscriptions` table
- Verifies subscription is active (`is_active = true`)
- Ensures billing interval is either `'monthly'` or `'annual'`
- Returns 403 error if validation fails
- Executes BEFORE expensive operations (Claude creds, Fly.io API calls)

### 2. RevenueCat Webhook Handler
**File:** `/workspace/anubix-web/app/api/webhooks/revenuecat/route.ts`

New endpoint that:
- Receives webhook events from RevenueCat
- Verifies Bearer token authentication
- Extracts subscription data from webhook payload
- Determines active status from "Anubix Pro" entitlement
- Infers billing interval from product_id naming convention
- Syncs subscription state to Supabase using admin client
- Stores full webhook payload in `raw_webhook_event` for debugging

### 3. Environment Variable
**File:** `.env.local`

Added `REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here`

---

## 🔐 Security Model

1. **Authentication**: Clerk JWT in API routes
2. **Authorization**: Subscription check in provision endpoint
3. **Database Access**:
   - User APIs: `createClerkSupabaseClient()` (RLS enabled)
   - Webhooks: `createSupabaseAdmin()` (bypasses RLS)
4. **Webhook Security**: Bearer token verification

---

## 📊 Database Schema

The `subscriptions` table (already created) has these key fields:

- `user_id` (text, unique) - Clerk user ID
- `is_active` (boolean) - Must be `true` to provision
- `billing_interval` (text) - Must be `'monthly'` or `'annual'`
- `current_period_end` (timestamp) - Subscription expiry date
- `product_id` (text) - RevenueCat product identifier
- `raw_webhook_event` (jsonb) - Full webhook payload for debugging

---

## 🔄 Data Flow

```
RevenueCat → Webhook Handler → Supabase (subscriptions table)
                                    ↓
User tries to provision → Provision API checks subscriptions table → Allow/Deny
```

---

## 🚀 Next Steps

### 1. Get RevenueCat Webhook Secret

1. Go to RevenueCat dashboard
2. Navigate to: **Project Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook** (or edit existing)
4. Generate authorization token
5. Copy the token value
6. Update `.env.local`:
   ```bash
   REVENUECAT_WEBHOOK_SECRET=your_actual_secret_here
   ```

### 2. Configure RevenueCat Webhook

In RevenueCat dashboard:

1. **Webhook URL**:
   - Local: `http://localhost:3000/api/webhooks/revenuecat`
   - Staging: `https://your-staging-url.vercel.app/api/webhooks/revenuecat`
   - Production: `https://anubix-web.vercel.app/api/webhooks/revenuecat`

2. **Authorization Header**: `Bearer <your_webhook_secret>`
   (RevenueCat adds "Bearer " automatically - just paste the token)

3. **Enable these events**:
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ UNCANCELLATION
   - ✅ PRODUCT_CHANGE
   - ✅ BILLING_ISSUE

4. Save webhook configuration

### 3. Deploy to Production

Add environment variable to Vercel:

1. Go to Vercel project settings
2. Navigate to **Environment Variables**
3. Add `REVENUECAT_WEBHOOK_SECRET` with the same value
4. Redeploy the application

### 4. Verify SUPABASE_SECRET_DEFAULT_KEY

The admin client already uses `SUPABASE_SECRET_DEFAULT_KEY` (set in `.env.local`).
No additional action needed - this is your Supabase service role key.

---

## 🧪 Testing Instructions

### Test 1: Provision Without Subscription (Should Fail)

**Setup:**
```sql
-- Run in Supabase SQL Editor
DELETE FROM subscriptions WHERE user_id = 'your_test_clerk_user_id';
```

**Test:**
1. Navigate to `/code` page while logged in
2. Try to provision a machine
3. **Expected**: 403 error: "Active subscription required. Please subscribe to provision a cloud machine."

---

### Test 2: Provision With Active Monthly Subscription (Should Succeed)

**Setup:**
```sql
-- Run in Supabase SQL Editor
INSERT INTO subscriptions (
  user_id,
  is_active,
  billing_interval,
  entitlement_id,
  current_period_end
)
VALUES (
  'your_test_clerk_user_id',
  true,
  'monthly',
  'Anubix Pro',
  (NOW() + INTERVAL '30 days')
)
ON CONFLICT (user_id) DO UPDATE SET
  is_active = true,
  billing_interval = 'monthly',
  current_period_end = (NOW() + INTERVAL '30 days');
```

**Test:**
1. Try to provision a machine
2. **Expected**: Provisioning succeeds normally

---

### Test 3: Provision With Annual Subscription (Should Succeed)

**Setup:**
```sql
-- Update to annual subscription
UPDATE subscriptions
SET
  billing_interval = 'annual',
  current_period_end = (NOW() + INTERVAL '1 year')
WHERE user_id = 'your_test_clerk_user_id';
```

**Test:**
1. Try to provision a machine
2. **Expected**: Provisioning succeeds

---

### Test 4: Provision With Invalid Billing Interval (Should Fail)

**Setup:**
```sql
-- Set invalid billing interval
UPDATE subscriptions
SET billing_interval = 'weekly'
WHERE user_id = 'your_test_clerk_user_id';
```

**Test:**
1. Try to provision a machine
2. **Expected**: 403 error: "Valid subscription plan required (monthly or annual)."

---

### Test 5: Provision With Inactive Subscription (Should Fail)

**Setup:**
```sql
-- Set subscription as inactive
UPDATE subscriptions
SET
  is_active = false,
  billing_interval = 'monthly'
WHERE user_id = 'your_test_clerk_user_id';
```

**Test:**
1. Try to provision a machine
2. **Expected**: 403 error: "Active subscription required..."

---

### Test 6: RevenueCat Webhook (End-to-End)

**Option A: Use RevenueCat Test Webhook**

1. Go to RevenueCat dashboard → Webhooks
2. Find your webhook and click "Send Test Event"
3. Select event type: `INITIAL_PURCHASE`
4. Customize payload:
```json
{
  "app_user_id": "your_test_clerk_user_id",
  "type": "INITIAL_PURCHASE",
  "subscriber": {
    "entitlements": {
      "Anubix Pro": {
        "expires_date": "2025-03-01T00:00:00Z"
      }
    },
    "subscriptions": {
      "anubix_pro_monthly": {
        "expires_date": "2025-03-01T00:00:00Z",
        "purchase_date": "2024-02-01T00:00:00Z",
        "store": "stripe"
      }
    }
  }
}
```
5. Send test webhook
6. Check Supabase:
```sql
SELECT * FROM subscriptions WHERE user_id = 'your_test_clerk_user_id';
```
7. **Expected**:
   - `is_active = true`
   - `billing_interval = 'monthly'`
   - `last_webhook_at` is recent timestamp
   - `raw_webhook_event` contains full payload

**Option B: Use cURL**

```bash
curl -X POST http://localhost:3000/api/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_webhook_secret" \
  -d '{
    "app_user_id": "your_test_clerk_user_id",
    "type": "INITIAL_PURCHASE",
    "subscriber": {
      "entitlements": {
        "Anubix Pro": {
          "expires_date": "2025-03-01T00:00:00Z"
        }
      },
      "subscriptions": {
        "anubix_pro_monthly": {
          "expires_date": "2025-03-01T00:00:00Z",
          "purchase_date": "2024-02-01T00:00:00Z",
          "store": "stripe"
        }
      }
    }
  }'
```

---

### Test 7: One Machine Per User (Already Enforced)

This is already enforced by existing code (lines 111-147 in provision route).

**Test:**
1. Provision first machine successfully
2. Try to provision second machine while first is still running
3. **Expected**: 409 error or returns existing machine details

---

## 🐛 Common Issues & Troubleshooting

### Issue: Webhook returns 401 Unauthorized

**Cause**: Authorization header doesn't match `REVENUECAT_WEBHOOK_SECRET`

**Fix**:
- Verify env var is set correctly in `.env.local`
- Check RevenueCat webhook config has correct Bearer token
- Format: `Authorization: Bearer <secret>`

---

### Issue: Subscription always shows inactive

**Cause**: Entitlement name mismatch or expired date

**Fix**:
- Check RevenueCat entitlement is named exactly "Anubix Pro" (case-insensitive)
- Verify `expires_date` is in the future
- Check `raw_webhook_event` column in database for actual payload

---

### Issue: Billing interval is NULL

**Cause**: Product ID doesn't contain "monthly" or "annual"

**Fix**:
Update product IDs in RevenueCat to include these keywords, or modify webhook handler to map product IDs explicitly:

```typescript
const billingIntervalMap: Record<string, string> = {
  'anubix_pro_1': 'monthly',
  'anubix_pro_2': 'annual',
};
billingInterval = billingIntervalMap[key] || null;
```

---

### Issue: createSupabaseAdmin() returns null

**Cause**: Missing `SUPABASE_SECRET_DEFAULT_KEY` environment variable

**Fix**:
- Check env var exists in `.env.local` and Vercel
- Should be the "service_role" key from Supabase dashboard → Settings → API

---

## 📝 Deployment Checklist

### Local Development
- [x] Add `REVENUECAT_WEBHOOK_SECRET` to `.env.local`
- [x] Verify `SUPABASE_SECRET_DEFAULT_KEY` exists in `.env.local`
- [ ] Test provisioning without subscription (should fail)
- [ ] Test provisioning with valid subscription (should succeed)
- [ ] Test webhook with cURL (verify database updated)

### Production (Vercel)
- [ ] Add `REVENUECAT_WEBHOOK_SECRET` to Vercel environment variables
- [ ] Verify `SUPABASE_SECRET_DEFAULT_KEY` exists in Vercel
- [ ] Configure RevenueCat webhook URL to production domain
- [ ] Send test webhook from RevenueCat dashboard
- [ ] Verify subscription created in production Supabase
- [ ] Test provisioning with production account

### RevenueCat Configuration
- [ ] Webhook URL configured: `https://your-domain/api/webhooks/revenuecat`
- [ ] Authorization header configured
- [ ] Events enabled: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, UNCANCELLATION
- [ ] Test webhook sent and verified successful

---

## 📦 Summary

**Files Created:**
- `/workspace/anubix-web/app/api/webhooks/revenuecat/route.ts` (webhook handler)

**Files Modified:**
- `/workspace/anubix-web/app/api/cloud/provision/route.ts` (added subscription check)
- `/workspace/anubix-web/.env.local` (added `REVENUECAT_WEBHOOK_SECRET`)

**Database:**
- No migrations needed (subscriptions table already exists)

**External Services:**
- Configure webhook in RevenueCat dashboard (see Next Steps)

**Key Requirements Met:**
✅ Only active subscriptions can provision
✅ Only monthly and annual billing intervals allowed
✅ One machine per user (already enforced)
✅ RevenueCat webhook syncs subscription state
✅ Secure with Bearer token authentication

**Total LOC:** ~150 lines of new code

---

## 🔗 Helpful Links

- [RevenueCat Webhooks Documentation](https://www.revenuecat.com/docs/webhooks)
- [RevenueCat Dashboard](https://app.revenuecat.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

**Implementation Date:** 2024-02-23
**Status:** ✅ Ready for testing and deployment
