import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/cloud/env-vars/sync
 * Pushes the user's env vars to their running Fly machine via the bridge.
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

  // Fetch user's env vars
  const { data: envRows, error: envErr } = await supabase
    .from('project_env_vars')
    .select()
    .eq('user_id', userId);

  if (envErr) {
    return NextResponse.json({ error: envErr.message }, { status: 500 });
  }

  const vars: Record<string, string> = {};
  for (const row of envRows ?? []) {
    vars[row.key] = decrypt(row.value_encrypted);
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

  const bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);

  // Push to bridge
  const res = await fetch(`${machine.bridge_url}/_bridge/env`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': bridgeApiKey,
    },
    body: JSON.stringify({ vars }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `Bridge returned ${res.status}: ${body}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, count: Object.keys(vars).length });
}
