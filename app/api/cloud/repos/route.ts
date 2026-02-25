import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/cloud/repos
 * Clones a git repo onto the user's running Fly machine.
 * Injects GitHub token if available for private repo access.
 * Body: { url: string, name?: string, branch?: string }
 */
export async function POST(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { url, name, branch } = body as { url: string; name?: string; branch?: string };

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Get user's running machine
  const { data: machine } = await supabase
    .from('cloud_machines')
    .select()
    .eq('user_email', email)
    .single();

  if (!machine || machine.status !== 'running') {
    return NextResponse.json({ error: 'No running machine found' }, { status: 404 });
  }

  if (!machine.bridge_url || !machine.bridge_api_key_encrypted) {
    return NextResponse.json({ error: 'Machine missing bridge credentials' }, { status: 500 });
  }

  const bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);

  // If it's a GitHub URL and user has a GitHub connection, inject token via URL parsing
  let cloneUrl = url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'github.com' && parsed.protocol === 'https:') {
      const { data: ghConn } = await supabase
        .from('github_connections')
        .select()
        .eq('user_email', email)
        .single();

      if (ghConn) {
        const token = decrypt(ghConn.access_token_encrypted);
        parsed.username = token;
        cloneUrl = parsed.toString();
      }
    }
  } catch {
    // Invalid URL — use as-is; the bridge will reject it if needed
  }

  // Forward to bridge
  const res = await fetch(`${machine.bridge_url}/_bridge/repos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': bridgeApiKey,
    },
    body: JSON.stringify({ url: cloneUrl, name, branch }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error || `Bridge returned ${res.status}` },
      { status: res.status >= 500 ? 502 : res.status },
    );
  }

  return NextResponse.json(data);
}
