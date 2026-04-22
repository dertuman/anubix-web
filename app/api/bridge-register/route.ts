import { NextRequest, NextResponse } from 'next/server';

import { hashInstallToken } from '@/lib/bridge-tokens';
import { createSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/bridge-register
 *
 * Called by the bridge itself, NOT by a user browser. Authenticates via the
 * install token (x-install-token header or body.installToken). No Clerk JWT
 * is involved — we use the service-role client to bypass RLS.
 *
 * Body: { publicUrl: string }
 *
 * Effects:
 *   - Looks up bridge_configs by install_token_hash
 *   - Updates bridge_url + last_seen_at
 *
 * Called on every bridge boot and as a periodic heartbeat so the UI can tell
 * whether the user's laptop is currently online.
 */
export async function POST(req: NextRequest) {
  let body: { publicUrl?: string; installToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const headerToken = req.headers.get('x-install-token');
  const installToken = (headerToken || body.installToken || '').trim();
  const publicUrl = (body.publicUrl || '').trim();

  if (!installToken) {
    return NextResponse.json(
      { error: 'Missing install token' },
      { status: 401 }
    );
  }
  if (!publicUrl || !/^https?:\/\//i.test(publicUrl)) {
    return NextResponse.json(
      { error: 'publicUrl must be an http(s) URL' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const tokenHash = hashInstallToken(installToken);

  const { data, error } = await supabase
    .from('bridge_configs')
    .update({
      bridge_url: publicUrl,
      last_seen_at: new Date().toISOString(),
    })
    .eq('install_token_hash', tokenHash)
    .select('email')
    .single();

  if (error || !data) {
    // Don't leak whether the token exists — 401 for both not-found and DB error.
    return NextResponse.json(
      { error: 'Invalid install token' },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
