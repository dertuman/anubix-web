# TODOs - Subscription Gating Setup

## 🔴 Critical - Complete RevenueCat Setup

### 1. Generate Webhook Secret in RevenueCat
- [ ] Go to RevenueCat Dashboard: https://app.revenuecat.com/
- [ ] Navigate to: **Project Settings** → **Integrations** → **Webhooks**
- [ ] Click **Add Webhook** (or edit existing)
- [ ] Generate a new **Authorization Token**
- [ ] Copy the token

### 2. Add Webhook Secret to Environment Variables
- [ ] **Local**: Update `.env.local`:
  ```bash
  REVENUECAT_WEBHOOK_SECRET=<paste_token_here>
  ```
- [ ] **Production**: Add to Vercel Environment Variables:
  - Go to Vercel project settings
  - Navigate to **Environment Variables**
  - Add: `REVENUECAT_WEBHOOK_SECRET` = `<paste_token_here>`
  - Redeploy after adding

### 3. Configure RevenueCat Webhook Endpoint
- [ ] In RevenueCat webhook settings, set:
  - **Webhook URL**:
    - Local: `http://localhost:3000/api/webhooks/revenuecat`
    - Production: `https://anubix-web.vercel.app/api/webhooks/revenuecat`
  - **Authorization**: `Bearer <your_webhook_secret>`
  - **Enable these events**:
    - ✅ INITIAL_PURCHASE
    - ✅ RENEWAL
    - ✅ CANCELLATION
    - ✅ EXPIRATION
    - ✅ UNCANCELLATION
    - ✅ PRODUCT_CHANGE
    - ✅ BILLING_ISSUE
- [ ] Save webhook configuration

### 4. Test the Webhook
- [ ] Send test webhook from RevenueCat dashboard
- [ ] Check Supabase `subscriptions` table for new entry
- [ ] Verify `is_active = true` and `billing_interval` is set correctly

### 5. Grant Yourself Access (For Testing)
Run this SQL in Supabase SQL Editor to give yourself immediate access:
```sql
INSERT INTO subscriptions (
  user_id,
  is_active,
  billing_interval,
  entitlement_id,
  current_period_end
)
VALUES (
  'your_clerk_user_id',  -- Replace with your actual Clerk user ID
  true,
  'annual',
  'Anubix Pro',
  (NOW() + INTERVAL '1 year')
)
ON CONFLICT (user_id) DO UPDATE SET
  is_active = true,
  billing_interval = 'annual',
  current_period_end = (NOW() + INTERVAL '1 year');
```

---

## 📝 Notes

- **Current Status**: Code is deployed, subscription gating is ACTIVE
- **Impact**: Users can't provision machines without active subscription
- **Webhook Handler**: Created at `/app/api/webhooks/revenuecat/route.ts`
- **Provision Check**: Added to `/app/api/cloud/provision/route.ts` (lines 73-93)
- **Documentation**: See `SUBSCRIPTION_GATING_IMPLEMENTATION.md` for full details

---

## 🧪 Testing Checklist (After Setup Complete)

- [ ] Test provisioning without subscription (should fail with 403)
- [ ] Test provisioning with active monthly subscription (should succeed)
- [ ] Test provisioning with active annual subscription (should succeed)
- [ ] Test provisioning with inactive subscription (should fail)
- [ ] Test webhook receives INITIAL_PURCHASE event correctly
- [ ] Test webhook receives RENEWAL event correctly
- [ ] Test webhook receives EXPIRATION event correctly

---

## 🔗 Quick Links

- [RevenueCat Dashboard](https://app.revenuecat.com/)
- [Supabase Dashboard](https://supabase.com/dashboard/project/qilgqjgkpsqmblperjji)
- [Vercel Project Settings](https://vercel.com/dashboard)
- [Implementation Guide](./SUBSCRIPTION_GATING_IMPLEMENTATION.md)
