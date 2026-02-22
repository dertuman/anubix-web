-- Add name and email columns to profiles table
-- These are synced from Clerk via the user.created and user.updated webhooks

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
