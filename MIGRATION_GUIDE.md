# Email-Based Authentication Migration Guide

This guide walks you through migrating the Anubix Web application from Clerk user ID-based authentication to email-based authentication.

## 📋 Overview

**Problem:** Different Clerk instances (development vs production) assign different user IDs to the same email, causing data isolation between environments (localhost, preview, production).

**Solution:** Migrate the entire application to use email as the primary identifier instead of Clerk user IDs.

**Result:** The same email (`alex.karslake@gmail.com`) can access the same data across localhost, preview (`anubix-u-phg3wn-6cc9.fly.dev`), and production (`anubix.ai`).

## 🔧 What Has Been Changed

### Code Changes (Completed)

✅ Created helper function: `/workspace/anubix-web/lib/auth-utils.ts`
- `getAuthEmail()` - Get authenticated user's email
- `requireAuthEmail()` - Get email or throw error
- `getAuthContext()` - Get both userId and email (for migration period)

✅ Updated 28 API routes to use email-based queries:
- All cloud machine routes (`/api/cloud/*`)
- All GitHub auth routes (`/api/auth/github/*`)
- All Claude auth routes (`/api/auth/claude/*`)
- All chat routes (`/api/chat/*`)
- Bridge config route (`/api/bridge-config`)
- User profile routes (`/api/users/*`)

✅ Updated library files:
- `/workspace/anubix-web/lib/chat-db.ts`
- `/workspace/anubix-web/lib/resolve-api-key.ts`

### Database Migrations (Ready to Run)

📄 **Migration 001:** Add email columns to all tables
- Location: `/workspace/anubix-web/supabase/migrations/001_add_email_columns.sql`
- Adds `email` or `user_email` column to 8 tables
- Creates indexes for performance
- Safe to run (non-destructive)

📄 **Migration 002:** Backfill email data
- Location: `/workspace/anubix-web/supabase/migrations/002_backfill_email_data.sql`
- Populates email columns from profiles table
- Safe to run (non-destructive)

📄 **Migration 003:** Update RLS policies
- Location: `/workspace/anubix-web/supabase/migrations/003_update_rls_policies_for_email.sql`
- Updates all Row Level Security policies to use email
- **REQUIRES:** Clerk JWT template updated (see step 3 below)

📄 **Migration 004:** Update unique constraints
- Location: `/workspace/anubix-web/supabase/migrations/004_update_unique_constraints.sql`
- Changes constraints to enforce one record per email
- Safe to run after migration 002

📄 **Migration 005:** Cleanup old columns (OPTIONAL)
- Location: `/workspace/anubix-web/supabase/migrations/005_cleanup_old_user_id_columns.sql`
- Removes old `user_id` columns (commented out by default)
- Only run after confirming everything works

## 🚀 Migration Steps

### Step 1: Backup Your Database

**CRITICAL:** Create a backup before running any migrations.

```bash
# Option 1: Use Supabase Dashboard
# Go to Database → Backups → Create Backup

# Option 2: Use pg_dump (if you have direct access)
pg_dump -h your-supabase-host -U postgres -d postgres > backup.sql
```

### Step 2: Run Database Migrations

Run migrations in order in the Supabase SQL Editor:

1. **Open Supabase Dashboard:**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to **SQL Editor** in left sidebar

2. **Run Migration 001:**
   ```sql
   -- Copy and paste contents of:
   -- /workspace/anubix-web/supabase/migrations/001_add_email_columns.sql
   ```
   - Click **Run**
   - Verify: No errors

3. **Run Migration 002:**
   ```sql
   -- Copy and paste contents of:
   -- /workspace/anubix-web/supabase/migrations/002_backfill_email_data.sql
   ```
   - Click **Run**
   - Verify: Email columns are populated

4. **Verify Data Migration:**
   ```sql
   -- Check that emails were backfilled correctly
   SELECT COUNT(*) as total, COUNT(user_email) as with_email
   FROM cloud_machines;

   SELECT COUNT(*) as total, COUNT(user_email) as with_email
   FROM conversations;

   -- Should show same number for both columns
   ```

### Step 3: Update Clerk JWT Template

**IMPORTANT:** This must be done BEFORE running migration 003.

Follow the instructions in `/workspace/anubix-web/CLERK_JWT_SETUP.md`:

1. Go to Clerk Dashboard → Configure → Sessions
2. Edit JWT Template
3. Add email claim:
   ```json
   {
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address}}"
   }
   ```
4. Save changes

**Do this for BOTH Clerk instances:**
- Development Clerk (for localhost)
- Production Clerk (for anubix.ai)

### Step 4: Run RLS and Constraint Migrations

After confirming JWT template is updated:

1. **Run Migration 003 (RLS Policies):**
   ```sql
   -- Copy and paste contents of:
   -- /workspace/anubix-web/supabase/migrations/003_update_rls_policies_for_email.sql
   ```
   - Click **Run**
   - Verify: No errors

2. **Run Migration 004 (Unique Constraints):**
   ```sql
   -- Copy and paste contents of:
   -- /workspace/anubix-web/supabase/migrations/004_update_unique_constraints.sql
   ```
   - Click **Run**
   - Verify: Constraints created successfully

### Step 5: Deploy Code Changes

The code changes are already in your repository. Deploy them:

```bash
# If using Vercel
vercel --prod

# If using other deployment
git push origin main
```

### Step 6: Test the Migration

1. **Test on localhost:**
   ```bash
   npm run dev
   ```
   - Log in with your email
   - Navigate to Code page
   - Verify you can see your cloud machine
   - Create a conversation in Chat
   - Verify conversation is saved

2. **Test on preview environment:**
   - Visit your preview URL (e.g., `anubix-u-phg3wn-6cc9.fly.dev`)
   - Log in with the SAME email
   - Verify you see the SAME cloud machine
   - Verify you see the SAME conversations
   - **This is the key test!** Same email should see same data

3. **Test on production:**
   - Visit `anubix.ai`
   - Log in with your email
   - Verify everything works
   - Verify data consistency

### Step 7: Monitor and Verify

1. **Check logs for errors:**
   ```bash
   # Vercel logs
   vercel logs --prod

   # Or check your deployment platform logs
   ```

2. **Verify RLS policies work:**
   ```sql
   -- This should return your data when logged in
   SELECT * FROM cloud_machines;

   -- This should return empty when logged out
   -- (test in SQL editor without auth)
   ```

3. **Test edge cases:**
   - Create new account with different email
   - Verify they don't see other users' data
   - Delete a conversation
   - Create a new cloud machine
   - Stop and start machine

### Step 8: Cleanup (OPTIONAL)

After confirming everything works for at least 1-2 weeks:

1. **Run Migration 005 (cleanup):**
   - Edit `/workspace/anubix-web/supabase/migrations/005_cleanup_old_user_id_columns.sql`
   - Uncomment the `DROP COLUMN` statements
   - Run in Supabase SQL Editor
   - This permanently removes old `user_id` columns

**WARNING:** Once you drop the columns, you cannot rollback easily. Keep them around unless disk space is a concern.

## 🔄 Rollback Plan

If something goes wrong, here's how to rollback:

### Option 1: Restore from Backup

```sql
-- Restore your database backup from Step 1
-- This will undo all migrations
```

### Option 2: Manual Rollback (if no backup)

```sql
-- 1. Revert RLS policies (migration 003)
-- Re-run the old policy creation scripts with user_id

-- 2. Revert unique constraints (migration 004)
ALTER TABLE cloud_machines DROP CONSTRAINT cloud_machines_user_email_key;
ALTER TABLE cloud_machines ADD CONSTRAINT cloud_machines_user_id_key UNIQUE (user_id);
-- Repeat for other tables

-- 3. Keep email columns (they don't hurt)
-- Just revert the code changes in your application
```

### Option 3: Revert Code Only

```bash
# If database migrations work but code has issues
git revert <commit-hash>
git push origin main
```

## ✅ Success Criteria

You'll know the migration succeeded when:

1. ✅ Same email can log in on localhost, preview, and production
2. ✅ Same data appears across all three environments
3. ✅ Cloud machine status is consistent
4. ✅ Conversations sync across environments
5. ✅ No RLS policy errors in logs
6. ✅ No authentication errors
7. ✅ Users can provision, start, stop, and destroy machines
8. ✅ Chat functionality works normally

## 🐛 Troubleshooting

### "Not authorized" errors

**Cause:** JWT doesn't include email claim

**Fix:**
1. Verify Clerk JWT template includes email
2. Clear browser cookies and log in again
3. Check JWT at [jwt.io](https://jwt.io) to verify email claim

### "Cannot read properties of null" errors

**Cause:** Email column not backfilled

**Fix:**
1. Run migration 002 again
2. Verify with: `SELECT user_email FROM cloud_machines;`

### RLS policy denies access

**Cause:** Email mismatch or RLS policy not updated

**Fix:**
1. Check JWT email matches database email
2. Run migration 003 again
3. Verify policies with:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'cloud_machines';
   ```

### Unique constraint violation

**Cause:** Trying to insert duplicate email

**Fix:**
1. Check if record already exists
2. Use `upsert` instead of `insert`
3. Verify migration 004 ran successfully

## 📞 Support

If you encounter issues:

1. Check the logs in your deployment platform
2. Check Supabase logs (Database → Logs)
3. Review the migration SQL files for comments
4. Check `CLERK_JWT_SETUP.md` for JWT template issues
5. Restore from backup and retry

## 📚 Related Files

- `/workspace/anubix-web/lib/auth-utils.ts` - Email auth helpers
- `/workspace/anubix-web/supabase/migrations/*.sql` - All migrations
- `/workspace/anubix-web/CLERK_JWT_SETUP.md` - Clerk JWT setup
- `/workspace/anubix-web/.env.local` - Environment variables (update if needed)
