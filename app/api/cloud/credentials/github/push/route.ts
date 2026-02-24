import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { decrypt } from '@/lib/encryption';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/cloud/credentials/github/push
 * Pushes GitHub credentials to the running Fly machine via bridge.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  // Fetch GitHub connection
  const { data: githubConn } = await supabase
    .from('github_connections')
    .select()
    .eq('user_id', userId)
    .single();

  if (!githubConn || !githubConn.access_token_encrypted) {
    return NextResponse.json(
      { error: 'No GitHub connection found' },
      { status: 404 }
    );
  }

  // Fetch running machine
  const { data: machine } = await supabase
    .from('cloud_machines')
    .select()
    .eq('user_id', userId)
    .single();

  if (!machine || machine.status !== 'running') {
    return NextResponse.json(
      { error: 'No running machine found' },
      { status: 404 }
    );
  }

  if (!machine.bridge_url || !machine.bridge_api_key_encrypted) {
    return NextResponse.json(
      { error: 'Machine missing bridge credentials' },
      { status: 500 }
    );
  }

  // Decrypt credentials
  let bridgeApiKey: string;
  let githubToken: string;
  try {
    bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);
    githubToken = decrypt(githubConn.access_token_encrypted);
  } catch {
    return NextResponse.json(
      { error: 'Failed to decrypt credentials' },
      { status: 500 }
    );
  }

  // Push to bridge
  try {
    const res = await fetch(`${machine.bridge_url}/_bridge/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': bridgeApiKey,
      },
      body: JSON.stringify({ githubToken }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Bridge returned ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
