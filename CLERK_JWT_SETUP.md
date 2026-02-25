# Clerk JWT Template Setup

## Purpose

This guide explains how to update your Clerk JWT template to include the `email` claim, which is required for email-based RLS policies in Supabase.

## Why This Is Needed

- The new RLS policies use `auth.jwt() ->> 'email'` to check email from the JWT
- By default, Clerk's JWT only includes the `sub` claim (user ID)
- We need to add the email to the JWT so Supabase can validate user access by email

## Steps to Update Clerk JWT Template

### 1. Access Clerk Dashboard

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application (anubix.ai)
3. Navigate to **Configure** → **Sessions** in the left sidebar

### 2. Edit JWT Template

1. Scroll down to **Customize session token**
2. Click **Edit** next to your JWT template (or create a new one if none exists)

### 3. Add Email Claim

Add the following JSON to your JWT template:

```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}"
}
```

**Important Notes:**
- The `sub` claim should already exist - don't remove it
- Add the `email` claim to include the user's primary email address
- Clerk will automatically populate `{{user.primary_email_address}}` with the actual email

### 4. Save and Apply

1. Click **Save** to save the template
2. The changes take effect immediately for new sessions
3. Existing sessions will use the new template when they refresh (typically within minutes)

## Verification

To verify the JWT includes the email claim:

### Option 1: Check in Browser DevTools

1. Log in to your application
2. Open Browser DevTools (F12)
3. Go to **Application** tab → **Cookies**
4. Find the `__session` cookie
5. Copy the value and decode it at [jwt.io](https://jwt.io)
6. Verify the payload includes both `sub` and `email` fields

### Option 2: Check in API Route

Add temporary logging in any API route:

```typescript
import { auth } from '@clerk/nextjs/server';

const { getToken } = await auth();
const token = await getToken();
console.log('JWT payload:', token);
```

You should see output like:
```json
{
  "sub": "user_abc123",
  "email": "alex.karslake@gmail.com",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Troubleshooting

### Email not appearing in JWT

- Make sure you saved the JWT template in Clerk dashboard
- Clear browser cookies and log in again
- Check that the user has a verified email address

### RLS policies still failing

- Run the RLS migration: `003_update_rls_policies_for_email.sql`
- Make sure the email columns have been backfilled: `002_backfill_email_data.sql`
- Verify the JWT template is active for your environment (dev vs production)

## Production vs Development

**Important:** You need to update the JWT template in BOTH Clerk instances:

1. **Development Clerk** (localhost):
   - Dashboard: Select your development application
   - Update JWT template as described above

2. **Production Clerk** (anubix.ai):
   - Dashboard: Select your production application
   - Update JWT template with the SAME configuration

This ensures email-based auth works consistently across all environments.
