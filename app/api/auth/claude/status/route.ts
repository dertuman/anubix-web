import { NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/claude/status
 * Returns Claude connection status for the current user.
 */
export async function GET() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data } = await supabase
    .from('claude_connections')
    .select('claude_mode, created_at')
    .eq('user_email', email)
    .single();

  if (!data) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    mode: data.claude_mode,
  });
}
