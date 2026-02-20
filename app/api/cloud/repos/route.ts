import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/cloud/repos
 * Clones a git repo onto the user's running Fly machine.
 * Injects GitHub token if available for private repo access.
 * Body: { url: string, name?: string, branch?: string }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
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
    .eq('user_id', userId)
    .single();

  if (!machine || machine.status !== 'running') {
    return NextResponse.json({ error: 'No running machine found' }, { status: 404 });
  }

  if (!machine.bridge_url || !machine.bridge_api_key_encrypted) {
    return NextResponse.json({ error: 'Machine missing bridge credentials' }, { status: 500 });
  }

  const bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);

  // If it's a GitHub URL and user has a GitHub connection, inject token into the URL
  let cloneUrl = url;
  if (url.includes('github.com')) {
    const { data: ghConn } = await supabase
      .from('github_connections')
      .select()
      .eq('user_id', userId)
      .single();

    if (ghConn) {
      const token = decrypt(ghConn.access_token_encrypted);
      // Replace https://github.com/ with https://TOKEN@github.com/
      cloneUrl = url.replace('https://github.com/', `https://${token}@github.com/`);
    }
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
