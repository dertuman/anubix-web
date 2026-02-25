# Email Auth Migration - Quick Checklist

Use this checklist to track your migration progress.

## Pre-Migration

- [ ] Read `MIGRATION_GUIDE.md` completely
- [ ] Read `EMAIL_AUTH_MIGRATION_SUMMARY.md` for overview
- [ ] Understand what changes are being made
- [ ] Schedule maintenance window (or just do it, it's fast!)

## Backup

- [ ] Create Supabase database backup
  - Go to: Supabase Dashboard → Database → Backups → Create Backup
  - OR: Run `pg_dump` if you have direct access
- [ ] Verify backup was created successfully
- [ ] Test backup restore procedure (optional but recommended)

## Clerk JWT Template - Development Instance

- [ ] Log in to Clerk Dashboard: https://dashboard.clerk.com
- [ ] Select your **development** application
- [ ] Navigate to: Configure → Sessions
- [ ] Click "Edit" on JWT template (or create if doesn't exist)
- [ ] Add email claim:
  ```json
  {
    "sub": "{{user.id}}",
    "email": "{{user.primary_email_address}}"
  }
  ```
- [ ] Click "Save"
- [ ] Verify it saved successfully

## Clerk JWT Template - Production Instance

- [ ] Log in to Clerk Dashboard: https://dashboard.clerk.com
- [ ] Select your **production** application (anubix.ai)
- [ ] Navigate to: Configure → Sessions
- [ ] Click "Edit" on JWT template
- [ ] Add email claim (same as above)
- [ ] Click "Save"
- [ ] Verify it saved successfully

## Database Migrations

### Option A: Run All at Once (Recommended)

- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Create new query
- [ ] Copy contents of `supabase/migrations/run_all_migrations.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify no errors in output
- [ ] Check that email columns were created
- [ ] Check that email data was backfilled
- [ ] Read the RLS policy note (you'll need to run 003 separately for full policies)

### Option B: Run Individually (More Control)

- [ ] Run `001_add_email_columns.sql`
  - Verify: Columns added, indexes created
- [ ] Run `002_backfill_email_data.sql`
  - Verify: Email columns populated
  - Check: `SELECT COUNT(user_email) FROM cloud_machines;`
- [ ] Run `003_update_rls_policies_for_email.sql`
  - Verify: Policies updated
  - Check: `SELECT * FROM pg_policies WHERE tablename = 'cloud_machines';`
- [ ] Run `004_update_unique_constraints.sql`
  - Verify: Constraints updated
  - Check: `SELECT * FROM pg_constraint WHERE conname LIKE '%email%';`

## Code Deployment

- [ ] Code changes are already in your repo
- [ ] Deploy to production:
  ```bash
  vercel --prod
  # OR your deployment method
  ```
- [ ] Wait for deployment to complete
- [ ] Check deployment logs for errors

## Testing - Localhost

- [ ] Start local dev server: `npm run dev`
- [ ] Clear browser cookies (to get fresh JWT)
- [ ] Log in with your email
- [ ] Navigate to Code page
- [ ] Verify cloud machine status loads
- [ ] Try starting/stopping machine (if you have one)
- [ ] Navigate to Chat page
- [ ] Create a new conversation
- [ ] Verify conversation is saved
- [ ] Check browser console for errors

## Testing - Preview Environment

- [ ] Visit your preview URL: `anubix-u-phg3wn-6cc9.fly.dev`
- [ ] Log in with the **SAME email** as localhost
- [ ] Navigate to Code page
- [ ] **CRITICAL TEST:** Do you see the same cloud machine? ✅
- [ ] Navigate to Chat page
- [ ] **CRITICAL TEST:** Do you see the same conversations? ✅
- [ ] Create a new conversation on preview
- [ ] Go back to localhost
- [ ] **CRITICAL TEST:** Do you see the new conversation on localhost? ✅
- [ ] Check browser console for errors

## Testing - Production

- [ ] Visit: `anubix.ai`
- [ ] Log in with the **SAME email**
- [ ] Navigate to Code page
- [ ] Verify cloud machine appears
- [ ] Navigate to Chat page
- [ ] Verify conversations appear
- [ ] Test creating new conversation
- [ ] Test all major features
- [ ] Check for any RLS policy errors in Supabase logs

## Verification

- [ ] Same email works on all three environments ✅
- [ ] Same data appears everywhere ✅
- [ ] No "Not authorized" errors
- [ ] No RLS policy errors in Supabase logs
- [ ] No errors in application logs
- [ ] Cloud machine operations work (provision, start, stop)
- [ ] Chat functionality works normally
- [ ] GitHub/Claude integrations work
- [ ] Bridge config loads correctly

## Post-Migration

- [ ] Monitor application logs for 24 hours
- [ ] Monitor Supabase logs for RLS errors
- [ ] Test with a second user (different email)
  - Verify they don't see your data
  - Verify RLS policies work correctly
- [ ] Document any issues found
- [ ] Consider running migration 005 (cleanup) after 1-2 weeks

## Cleanup (Optional - Run After 1-2 Weeks)

- [ ] Everything working for 1-2 weeks?
- [ ] No rollback needed?
- [ ] Ready to remove old user_id columns?
- [ ] Edit `005_cleanup_old_user_id_columns.sql`
- [ ] Uncomment the DROP COLUMN statements
- [ ] Run in Supabase SQL Editor
- [ ] Verify columns removed
- [ ] Update TypeScript types if needed

## Rollback (If Needed)

If something goes wrong:

- [ ] Restore database from backup
- [ ] Revert code changes (git revert)
- [ ] Revert Clerk JWT template
- [ ] Check `MIGRATION_GUIDE.md` rollback section
- [ ] Document what went wrong
- [ ] Fix the issue
- [ ] Try again

## Success Criteria

✅ You're done when:

- [x] All migrations run without errors
- [x] Code deployed to production
- [x] Same email works on localhost, preview, and production
- [x] Same data appears in all three environments
- [x] No errors in logs
- [x] All features working normally
- [x] Cloud machine operations work
- [x] Chat functionality works
- [x] Multi-user testing passes (different emails see different data)

---

## Quick Commands Reference

```bash
# Start local dev
npm run dev

# Deploy to production
vercel --prod

# Check Vercel logs
vercel logs --prod

# Check Supabase (use dashboard)
# Database → Logs → Select time range
```

## SQL Quick Reference

```sql
-- Verify email columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'cloud_machines' AND column_name LIKE '%email%';

-- Count records with email
SELECT COUNT(*) as total, COUNT(user_email) as with_email
FROM cloud_machines;

-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename IN ('cloud_machines', 'conversations');

-- Check unique constraints
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE conname LIKE '%email%' AND contype = 'u';
```

---

**Total Time Required:** ~30 minutes
**Difficulty Level:** Medium (mostly clicking and copy-paste)
**Risk Level:** Low (migrations are non-destructive, code is backward compatible)

Good luck! You got this! 🚀
