import { NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/auth/claude/disconnect
 * Removes stored Claude credentials for the current user.
 */
export async function POST() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  await supabase
    .from('claude_connections')
    .delete()
    .eq('email', email);

  return NextResponse.json({ ok: true });
}
