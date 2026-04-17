import { getAuthEmail } from '@/lib/auth-utils';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type AdminGateResult =
  | {
      ok: true;
      error: null;
      status: 200;
      supabase: SupabaseClient<Database>;
      email: string;
      profile: { name: string; email: string; profile_picture: string | null; is_admin: boolean };
    }
  | {
      ok: false;
      error: string;
      status: 401 | 403 | 503;
      supabase: null;
      email: null;
      profile: null;
    };

/**
 * Verifies the caller is an authenticated admin and returns a service-role
 * Supabase client plus their profile. Use this at the top of /api/admin/*
 * routes. Check `gate.ok` to narrow.
 */
export async function requireAdmin(): Promise<AdminGateResult> {
  const email = await getAuthEmail();
  if (!email) {
    return { ok: false, error: 'Unauthorized', status: 401, supabase: null, email: null, profile: null };
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Database not configured', status: 503, supabase: null, email: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, profile_picture, is_admin')
    .eq('email', email)
    .single();

  if (!profile?.is_admin) {
    return { ok: false, error: 'Forbidden', status: 403, supabase: null, email: null, profile: null };
  }

  return { ok: true, error: null, status: 200, supabase, email, profile };
}
