'use client';

import { useSession } from '@clerk/nextjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

import type { Database } from '@/types/supabase';

export function useClerkSupabaseClient(): SupabaseClient<Database> | null {
  const { session } = useSession();

  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (!url || !publishableKey) return null;

    return createClient<Database>(url, publishableKey, {
      accessToken: async () => {
        return (await session?.getToken()) ?? null;
      },
    });
  }, [session]);

  return client;
}
