import { auth } from '@clerk/nextjs/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

/**
 * Creates a Supabase client authenticated via Clerk.
 *
 * The token is fetched once eagerly and cached for the lifetime of the
 * client (i.e. a single API request). This avoids calling auth().getToken()
 * on every Supabase query, which was hammering Clerk and causing rate limits.
 */
export async function createClerkSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !publishableKey) return null;

  // Resolve the Clerk token ONCE up front
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' });
  if (!token) return null;

  return createClient<Database>(url, publishableKey, {
    accessToken: async () => token,
  });
}

export function createSupabaseAdmin(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_DEFAULT_KEY;

  if (!url || !secretKey) return null;

  return createClient<Database>(url, secretKey);
}
