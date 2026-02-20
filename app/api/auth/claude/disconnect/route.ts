import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/claude/disconnect
 * Removes stored Claude credentials for the current user.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  await supabase
    .from('claude_connections')
    .delete()
    .eq('user_id', userId);

  return NextResponse.json({ ok: true });
}
