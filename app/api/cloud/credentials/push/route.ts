import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/cloud/credentials/push
 *
 * Reads the user's latest Claude credentials from `claude_connections`,
 * then pushes them to the running Fly machine via the bridge's /_bridge/env endpoint.
 * This allows updating Claude credentials without destroying the machine.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const supabase = await createClerkSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Fetch current Claude credentials
    const { data: claudeConn } = await supabase
      .from('claude_connections')
      .select()
      .eq('user_id', userId)
      .single();

    if (!claudeConn) {
      return NextResponse.json(
        { error: 'No Claude credentials found. Please authenticate first.' },
        { status: 400 },
      );
    }

    const claudeMode = claudeConn.claude_mode as 'cli' | 'sdk';
    const claudeAuthJson = claudeConn.auth_json_encrypted
      ? decrypt(claudeConn.auth_json_encrypted)
      : undefined;
    const anthropicApiKey = claudeConn.api_key_encrypted
      ? decrypt(claudeConn.api_key_encrypted)
      : undefined;

    if (claudeMode === 'cli' && !claudeAuthJson) {
      return NextResponse.json({ error: 'Claude CLI credentials are incomplete.' }, { status: 400 });
    }
    if (claudeMode === 'sdk' && !anthropicApiKey) {
      return NextResponse.json({ error: 'Claude API key is missing.' }, { status: 400 });
    }

    // Fetch the running machine
    const { data: machine } = await supabase
      .from('cloud_machines')
      .select()
      .eq('user_id', userId)
      .single();

    if (!machine || machine.status !== 'running') {
      return NextResponse.json({ error: 'No running machine found.' }, { status: 404 });
    }

    if (!machine.bridge_url || !machine.bridge_api_key_encrypted) {
      return NextResponse.json({ error: 'Machine missing bridge credentials.' }, { status: 500 });
    }

    const bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);

    // Build credential payload for the dedicated credentials endpoint
    const credentialPayload: Record<string, string> = { claudeMode };
    if (claudeMode === 'cli' && claudeAuthJson) {
      credentialPayload.claudeAuthJson = claudeAuthJson;
    }
    if (claudeMode === 'sdk' && anthropicApiKey) {
      credentialPayload.anthropicApiKey = anthropicApiKey;
    }

    // Push to bridge via dedicated credentials endpoint
    // This writes CLI creds to ~/.claude/.credentials.json (not .env.local)
    // and sets ANTHROPIC_API_KEY in process.env for SDK mode
    const res = await fetch(`${machine.bridge_url}/_bridge/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': bridgeApiKey,
      },
      body: JSON.stringify(credentialPayload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Bridge returned ${res.status}: ${text}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, mode: claudeMode });
  } catch (err) {
    console.error('Unhandled error pushing credentials:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
