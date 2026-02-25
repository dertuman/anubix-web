-- ============================================================
-- FIX CONVERSATIONS EMAIL COLUMN AND RLS POLICIES
-- ============================================================
--
-- Issue: conversations table has both `email` and `user_email` columns
-- from different migrations. The code uses `email` but RLS uses `user_email`
--
-- This migration:
-- 1. Ensures `email` column exists
-- 2. Copies data from `user_email` to `email` if needed
-- 3. Updates RLS policies to use `email`
-- 4. Optionally drops `user_email` column after data is migrated
--
-- ============================================================

\set ON_ERROR_STOP on

-- Show start time
SELECT NOW() as migration_start_time;

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Fixing conversations table ===';
END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 1: Ensure email column exists and copy data from user_email
-- ────────────────────────────────────────────────────────────

-- Add email column if it doesn't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email TEXT;

-- Copy data from user_email to email if user_email exists and email is null
DO $$
DECLARE
  rows_updated INTEGER;
  user_email_exists BOOLEAN;
BEGIN
  -- Check if user_email column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'conversations'
    AND column_name = 'user_email'
  ) INTO user_email_exists;

  IF user_email_exists THEN
    -- Copy data from user_email to email where email is null
    UPDATE conversations
    SET email = user_email
    WHERE email IS NULL AND user_email IS NOT NULL;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '✓ Copied % rows from user_email to email', rows_updated;
  ELSE
    RAISE NOTICE '✓ user_email column does not exist, skipping data copy';
  END IF;
END $$;

-- Create index on email column
CREATE INDEX IF NOT EXISTS idx_conversations_email ON conversations(email);
DO $$ BEGIN RAISE NOTICE '✓ Created index on email column'; END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 2: Update RLS policies to use email column
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Updating RLS policies ===';
END $$;

-- Drop old policies (both user_email and email versions)
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

DROP POLICY IF EXISTS "Users can read own conversations by email" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations by email" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations by email" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations by email" ON conversations;

-- Create new email-based policies
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

DO $$ BEGIN RAISE NOTICE '✓ RLS policies updated to use email column'; END $$;

-- ────────────────────────────────────────────────────────────
-- STEP 3: Optionally drop user_email column (commented out for safety)
-- ────────────────────────────────────────────────────────────

-- Uncomment this after verifying everything works:
-- ALTER TABLE conversations DROP COLUMN IF EXISTS user_email;
-- DROP INDEX IF EXISTS idx_conversations_user_email;

-- ────────────────────────────────────────────────────────────
-- DONE!
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ CONVERSATIONS EMAIL FIX COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test creating conversations';
  RAISE NOTICE '2. If successful, uncomment the DROP COLUMN statement';
  RAISE NOTICE '';
END $$;

-- Show end time
SELECT NOW() as migration_end_time;

-- Verify the schema
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name IN ('email', 'user_email', 'clerk_user_id')
ORDER BY column_name;
