# Fix Conversations "Failed to create conversation" Error

## Problem
The conversations table has a mismatch between:
- **Code**: Tries to insert into `email` column
- **RLS Policies**: Check for `user_email` column

This causes INSERT statements to fail with "Failed to create conversation" error.

## Solution
Run the migration to fix the RLS policies:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/007_fix_conversations_email_column.sql`
4. Click **Run**

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed locally
npx supabase db push

# Or run the specific migration
npx supabase migration up --db-url "your-db-url" --file supabase/migrations/007_fix_conversations_email_column.sql
```

### Option 3: Direct psql

```bash
# Connect to your database
psql "your-postgresql-connection-string"

# Run the migration
\i supabase/migrations/007_fix_conversations_email_column.sql
```

## What the Migration Does

1. **Ensures `email` column exists** on `conversations` table
2. **Copies data** from `user_email` to `email` if needed
3. **Updates RLS policies** to use `email` instead of `user_email`
4. **Creates index** on `email` column for performance

## Verification

After running the migration, test by:

1. Going to the chat/workspace page
2. Trying to create a new conversation
3. Sending a message

You should no longer see the "Failed to create conversation" error.

## Manual Fix (If migration fails)

If the migration fails, you can manually run these SQL commands in Supabase SQL Editor:

```sql
-- 1. Add email column
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Copy data from user_email if it exists
UPDATE conversations SET email = user_email WHERE email IS NULL AND user_email IS NOT NULL;

-- 3. Drop old RLS policies
DROP POLICY IF EXISTS "Users can read own conversations by email" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations by email" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations by email" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations by email" ON conversations;

-- 4. Create new RLS policies using email column
CREATE POLICY "Users can read own conversations by email"
  ON conversations FOR SELECT
  USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can insert own conversations by email"
  ON conversations FOR INSERT
  WITH CHECK (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own conversations by email"
  ON conversations FOR UPDATE
  USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own conversations by email"
  ON conversations FOR DELETE
  USING (email = (SELECT auth.jwt() ->> 'email'));

-- 5. Create index
CREATE INDEX IF NOT EXISTS idx_conversations_email ON conversations(email);
```

## Root Cause

The issue occurred because:
1. Migration `001_add_email_columns.sql` added `user_email` column
2. Migration `FINAL_run_migrations.sql` added `email` column
3. Migration `003_update_rls_policies_for_email.sql` created RLS policies for `user_email`
4. The application code was updated to use `email` column
5. RLS policies were never updated to match

This migration fixes the mismatch.
