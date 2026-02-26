import { NextResponse } from 'next/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { getAuthEmail } from '@/lib/auth-utils';

/**
 * GET /api/cloud/status
 *
 * Returns the current cloud machine state for the authenticated user.
 * If the DB says "starting" but the bridge is actually healthy, auto-fixes to "running".
 */
export async function GET() {
  try { return await handleStatus(); } catch (err) {
    console.error('Unhandled status error:', err);
    return NextResponse.json({ machine: null }, { status: 200 });
  }
}

async function handleStatus() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Query by email (works across all Clerk instances)
  const { data, error } = await supabase
    .from('cloud_machines')
    .select()
    .eq('email', email)
    .single();

  if (error || !data) {
    return NextResponse.json({ machine: null });
  }

  // Auto-recover: if stuck on "starting" or "provisioning", check if bridge is actually healthy
  let status = data.status;
  if (
    (status === 'starting' || status === 'provisioning') &&
    data.bridge_url &&
    data.bridge_api_key_encrypted
  ) {
    try {
      const apiKey = decrypt(data.bridge_api_key_encrypted);
      const res = await fetch(`${data.bridge_url}/_bridge/health`, {
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        status = 'running';
        await supabase.from('cloud_machines').update({
          status: 'running',
          last_health_check_at: new Date().toISOString(),
        }).eq('email', email);
      }
    } catch {
      // Bridge not reachable or credentials undecryptable — keep current status
    }
  }

  let bridgeApiKey: string | null = null;
  try {
    bridgeApiKey = data.bridge_api_key_encrypted
      ? decrypt(data.bridge_api_key_encrypted)
      : null;
  } catch {
    // Credentials undecryptable — return null so client doesn't try to connect
  }

  return NextResponse.json({
    machine: {
      status,
      bridgeUrl: data.bridge_url,
      bridgeApiKey,
      previewUrl: data.bridge_url || null,
      region: data.fly_region,
      claudeMode: data.claude_mode,
      templateName: data.template_name,
      gitRepoUrl: data.git_repo_url,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      stoppedAt: data.stopped_at,
      lastHealthCheckAt: data.last_health_check_at,
    },
  });
}
