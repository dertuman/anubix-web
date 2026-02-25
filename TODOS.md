# TODOS

## Email-Based Auth — Current State

All code queries Supabase by **email** (never Clerk userId). This means the same email sees the same data regardless of which Clerk instance (dev vs prod) issues the JWT.

### How it works

1. Clerk JWT template (named `"supabase"`) includes an `email` claim: `{{user.primary_email_address}}`
2. Supabase RLS policies check `auth.jwt() ->> 'email'` against the row's email column
3. API routes use `getAuthEmail()` from `lib/auth-utils.ts` — resolves Clerk userId to email server-side
4. Supabase client created via `getToken({ template: 'supabase' })` in `lib/supabase/server.ts` (server) and `lib/supabase/client.ts` (client)

### Clerk JWT template config (both dev and prod)

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "email": "{{user.primary_email_address}}",
  "app_metadata": {},
  "user_metadata": {}
}
```

Signing: HS256 with Supabase JWT secret as the custom signing key.

### RLS policy pattern

```sql
-- Every table uses this pattern
CREATE POLICY "Users can read own data"
  ON some_table FOR SELECT
  USING (user_email = (SELECT auth.jwt() ->> 'email'));
```

Tables and their email column names:
- `profiles` — `email`
- `subscriptions` — `email`
- `bridge_configs` — `email`
- `cloud_machines` — `user_email`
- `conversations` — `user_email`
- `chat_api_keys` — `user_email`
- `project_env_vars` — `user_email`
- `github_connections` — `user_email`
- `claude_connections` — `user_email`

### SQL to apply email-based RLS (run on Supabase if not already done)

Migration file: `supabase/migrations/003_update_rls_policies_for_email.sql`

Quick check if a table still uses the old `sub`-based policy:
```sql
SELECT tablename, policyname, qual FROM pg_policies
WHERE qual LIKE '%sub%' ORDER BY tablename;
```

If any results show up, re-run migration 003 for those tables.

---

## DB Cleanup — Old Columns (Optional)

Old `user_id` / `clerk_user_id` columns still exist in the database. They're unused by code but take space. Migration file: `supabase/migrations/005_cleanup_old_user_id_columns.sql` (DROP statements are commented out — uncomment when ready).

TypeScript types in `types/supabase.ts` and `types/chat.ts` still reference `clerk_user_id` — these are auto-generated from the DB schema and will clean up after dropping the old columns and regenerating types.

---

## Deprecated Supabase Patterns — What to Watch

The current Clerk + Supabase integration uses a **custom JWT template** with HS256 signing. This is the "legacy JWT" approach. Supabase now recommends **native third-party auth** (`supabase.auth.signInWithIdToken()`) which doesn't require JWT templates at all.

### Current approach (what we use)
- Clerk JWT template named `"supabase"` with custom signing key = Supabase JWT secret
- `createClient()` with `accessToken` callback that returns the Clerk-signed JWT
- RLS policies read claims from `auth.jwt()`

### Modern approach (potential upgrade)
- Supabase native third-party auth: register Clerk as a trusted provider in Supabase dashboard
- Client calls `supabase.auth.signInWithIdToken({ provider: 'clerk', token })`
- No custom JWT template needed — Supabase validates via Clerk's JWKS endpoint
- RLS can use `auth.uid()` again (Supabase maps the Clerk user)
- Docs: https://supabase.com/docs/guides/auth/third-party/clerk

### Why we haven't migrated yet
- Current setup works and is already deployed
- The native approach changes auth flow significantly
- Would need to update both `lib/supabase/server.ts` and `lib/supabase/client.ts`
- RLS policies would need updating again
- Low priority — do this when there's breathing room

---

## RevenueCat Subscription Gating

### Current state
- `checkSubscriptionOrAdmin()` in `lib/check-subscription.ts` checks `profiles.is_admin` and `subscriptions.is_active` by email
- Provision route (`app/api/cloud/provision/route.ts`) calls this before allowing machine creation
- RevenueCat webhook handler at `app/api/webhooks/revenuecat/route.ts` syncs subscription state

### Still TODO
- [ ] Configure RevenueCat webhook URL in RevenueCat dashboard (production)
- [ ] Test end-to-end: purchase -> webhook -> subscription row -> provision allowed
- [ ] Add subscription status UI in workspace (show plan, expiry, upgrade CTA)
- [ ] Handle grace periods / billing issues gracefully in the UI

---

## Other TODOs

- [ ] Git init on Fly.io workspace after initial deploy (for push-to-deploy flow)
- [ ] "Deploy" button in workspace UI (shortcut for git push)
- [ ] Patterns system — pre-built feature templates users can add with one click
- [ ] Tunneling solution for preview (needs to be cheap at scale)
