import { auth } from '@clerk/nextjs/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export function createClerkSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !publishableKey) return null;

  return createClient<Database>(url, publishableKey, {
    accessToken: async () => {
      return (await auth()).getToken();
    },
  });
}

export function createSupabaseAdmin(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_DEFAULT_KEY;

  if (!url || !secretKey) return null;

  return createClient<Database>(url, secretKey);
}
