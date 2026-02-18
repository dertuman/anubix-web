/**
 * SQL template for creating the profiles table + RLS policies in Supabase.
 * Users copy-paste this into the Supabase SQL Editor during setup.
 */

export const PROFILES_TABLE_SQL = `-- ============================================
-- Talkartech Template — Supabase Setup SQL
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  bio TEXT DEFAULT '' NOT NULL,
  dob DATE,
  profile_picture TEXT DEFAULT 'https://placehold.co/600x400/png?text=Hello+World' NOT NULL,
  font TEXT DEFAULT 'inter' NOT NULL,
  theme TEXT DEFAULT 'dark' NOT NULL,
  language TEXT DEFAULT 'en' NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING ((select (auth.jwt()->>'sub')) = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select (auth.jwt()->>'sub')) = id);

-- Service role has full access (used by Clerk webhooks)
CREATE POLICY "Service role full access"
  ON public.profiles FOR ALL
  USING ((select auth.role()) = 'service_role');

-- 4. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
`;