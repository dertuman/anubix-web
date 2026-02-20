import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/cloud/env-vars/push
 * Pushes env vars directly to the running Fly machine via the bridge.
 * No database involved — vars go straight to the machine's .env.local.
 *
 * Body: { vars: Record<string, string>, repo_path?: string }
 *   - vars: key-value pairs to set on the machine
 *   - repo_path: optional repo path (for multi-repo sessions)
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

  // Parse body
  let vars: Record<string, string>;
  let repoPath: string | undefined;
  try {
    const body = await req.json();
    vars = body?.vars;
    repoPath = body?.repo_path;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!vars || typeof vars !== 'object' || Array.isArray(vars)) {
    return NextResponse.json({ error: 'vars must be an object of key-value pairs' }, { status: 400 });
  }

  // Fetch user's cloud machine for bridge URL + API key
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

  let bridgeApiKey: string;
  try {
    bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt bridge credentials — encryption key may have changed' }, { status: 500 });
  }

  // Push directly to bridge
  try {
    const payload: Record<string, unknown> = { vars };
    if (repoPath && repoPath !== '__global__') {
      payload.repoPath = repoPath;
    }

    const res = await fetch(`${machine.bridge_url}/_bridge/env`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': bridgeApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: `Bridge returned ${res.status}: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, count: Object.keys(vars).length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
