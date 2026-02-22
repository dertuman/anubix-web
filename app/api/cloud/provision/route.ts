import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';
import {
  createFlyApp,
  allocateFlyIps,
  createFlyVolume,
  createFlyMachine,
  waitForMachineState,
  waitForBridgeHealth,
  teardownFlyResources,
} from '@/lib/fly-machines';

/**
 * ============================================================
 * TEMPORARILY PASSWORD-PROTECTED
 * ============================================================
 * Provisioning requires the X-Access-Password header to match
 * the ACCESS_PASSWORD environment variable.
 *
 * TO RE-ENABLE (remove password gate):
 * 1. Delete the password check block at the top of POST.
 * 2. Also remove the password gate from the code page at:
 *      app/(public)/code/page.tsx
 * ============================================================
 */

// Allow up to 300s for Fly.io provisioning (app + volume + machine + template install + health check)
// Heavy templates like talkartech-fullstack need 3-5 min for git clone + npm install before the server starts.
export const maxDuration = 300;

/**
 * POST /api/cloud/provision
 *
 * One-click provisioning: creates a Fly.io app + volume + machine
 * running the anubix-bridge Docker image. Returns the bridge URL
 * and API key so the client can auto-connect.
 */
export async function POST(req: NextRequest) {
  // ── Password gate (temporary) ─────────────────────────────
  const requiredPassword = process.env.ACCESS_PASSWORD;
  if (requiredPassword) {
    const accessPassword = req.headers.get('x-access-password');
    if (accessPassword !== requiredPassword) {
      return NextResponse.json(
        { error: 'Provisioning is temporarily disabled. Something amazing is coming soon.' },
        { status: 503 },
      );
    }
  }

  try { return await handleProvision(req); } catch (err) {
    console.error('Unhandled provision error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleProvision(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // ── Parse request ──────────────────────────────────────────
  const body = await req.json();
  const {
    templateName,
    gitRepoUrl,
    region = 'lhr',
  } = body as {
    templateName?: string;
    gitRepoUrl?: string;
    region?: string;
  };

  // ── Fetch Claude credentials from profile ──────────────────
  const { data: claudeConn } = await supabase
    .from('claude_connections')
    .select()
    .eq('user_id', userId)
    .single();

  if (!claudeConn) {
    return NextResponse.json(
      { error: 'No Claude credentials found. Go to Profile > Integrations to connect Claude first.' },
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
    return NextResponse.json({ error: 'Claude CLI credentials are incomplete. Please reconnect in Profile > Integrations.' }, { status: 400 });
  }
  if (claudeMode === 'sdk' && !anthropicApiKey) {
    return NextResponse.json({ error: 'Claude API key is missing. Please reconnect in Profile > Integrations.' }, { status: 400 });
  }

  // ── Check for existing machine ─────────────────────────────
  const { data: existing } = await supabase
    .from('cloud_machines')
    .select()
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.status === 'running') {
      // Already running — return connection details
      return NextResponse.json({
        bridgeUrl: existing.bridge_url,
        bridgeApiKey: existing.bridge_api_key_encrypted
          ? decrypt(existing.bridge_api_key_encrypted)
          : '',
        previewUrl: existing.bridge_url || null,
        status: 'running',
      });
    }
    if (existing.status === 'provisioning' || existing.status === 'starting') {
      return NextResponse.json(
        { error: 'Machine is already being provisioned. Please wait.' },
        { status: 409 },
      );
    }
    if (existing.status === 'stopped') {
      // Restart it instead of creating a new one
      return NextResponse.json(
        { error: 'Machine is stopped. Use /api/cloud/start to resume it.' },
        { status: 409 },
      );
    }
    // If destroyed or error, clean up the row and create fresh
    if (existing.status === 'destroyed' || existing.status === 'error') {
      await supabase.from('cloud_machines').delete().eq('user_id', userId);
    }
  }

  // ── Fetch user's env vars ──────────────────────────────────
  let projectEnvVarsJson: string | undefined;
  {
    const { data: envRows } = await supabase
      .from('project_env_vars')
      .select()
      .eq('user_id', userId);
    if (envRows && envRows.length > 0) {
      const envMap: Record<string, string> = {};
      for (const row of envRows) {
        envMap[row.key] = decrypt(row.value_encrypted);
      }
      projectEnvVarsJson = JSON.stringify(envMap);
    }
  }

  // ── Fetch GitHub token for private repos ──────────────────
  let githubToken: string | undefined;
  if (gitRepoUrl && gitRepoUrl.includes('github.com')) {
    const { data: ghConn } = await supabase
      .from('github_connections')
      .select()
      .eq('user_id', userId)
      .single();
    if (ghConn) {
      githubToken = decrypt(ghConn.access_token_encrypted);
    }
  }

  // ── Generate identifiers ───────────────────────────────────
  const shortId = userId.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, 'x');
  const rand = randomBytes(2).toString('hex');
  const appName = `anubix-u-${shortId}-${rand}`;
  const bridgeApiKey = randomBytes(32).toString('base64url');
  const bridgeUrl = `https://${appName}.fly.dev`;

  // ── Insert DB row (provisioning) ───────────────────────────
  const { error: insertErr } = await supabase.from('cloud_machines').insert({
    user_id: userId,
    fly_app_name: appName,
    fly_region: region,
    bridge_url: bridgeUrl,
    bridge_api_key_encrypted: encrypt(bridgeApiKey),
    claude_mode: claudeMode,
    claude_auth_json_encrypted: claudeAuthJson ? encrypt(claudeAuthJson) : null,
    anthropic_api_key_encrypted: anthropicApiKey ? encrypt(anthropicApiKey) : null,
    template_name: templateName || null,
    git_repo_url: gitRepoUrl || null,
    status: 'provisioning',
  });

  if (insertErr) {
    console.error('cloud_machines insert error:', insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // ── Provision on Fly.io ────────────────────────────────────
  let volumeId: string | undefined;
  let machineId: string | undefined;

  try {
    // 1. Create app
    await createFlyApp(appName);

    // 2. Allocate IPs + create volume in parallel (both need app, not each other)
    const [, volume] = await Promise.all([
      allocateFlyIps(appName),
      createFlyVolume(appName, region, 3),
    ]);
    volumeId = volume.id;

    // 3. Create machine
    const machine = await createFlyMachine(appName, {
      bridgeApiKey,
      claudeMode,
      claudeAuthJson: claudeAuthJson || undefined,
      anthropicApiKey: anthropicApiKey || undefined,
      volumeId,
      region,
      templateName: templateName || undefined,
      gitRepoUrl: gitRepoUrl || undefined,
      memoryMb: 8192, // 8GB RAM: Claude SDK + dev server + build tools (beefy test config)
      projectEnvVarsJson,
      githubToken,
    });
    machineId = machine.id;

    // Update DB with Fly.io resource IDs
    await supabase.from('cloud_machines').update({
      fly_machine_id: machineId,
      fly_volume_id: volumeId,
      status: 'starting',
    }).eq('user_id', userId);

    // 4. Wait for machine to start
    await waitForMachineState(appName, machineId, 'started', 120);

    // 5. Wait for bridge health check
    await waitForBridgeHealth(bridgeUrl, bridgeApiKey);

    // 6. Mark as running
    await supabase.from('cloud_machines').update({
      status: 'running',
      last_health_check_at: new Date().toISOString(),
    }).eq('user_id', userId);

    // 7. Also update bridge_configs so useBridgeConfig auto-connects
    await supabase.from('bridge_configs').upsert(
      {
        user_id: userId,
        bridge_url: bridgeUrl,
        api_key_encrypted: encrypt(bridgeApiKey),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    return NextResponse.json({
      bridgeUrl,
      bridgeApiKey,
      previewUrl: bridgeUrl,
      status: 'running',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown provisioning error';
    console.error('Provisioning failed:', message);

    // Update DB with error
    await supabase.from('cloud_machines').update({
      status: 'error',
      error_message: message,
      fly_machine_id: machineId || null,
      fly_volume_id: volumeId || null,
    }).eq('user_id', userId);

    // Best-effort cleanup
    await teardownFlyResources(appName, machineId);

    // Remove the failed DB row so user can retry
    await supabase.from('cloud_machines').delete().eq('user_id', userId);

    return NextResponse.json({ error: `Provisioning failed: ${message}` }, { status: 500 });
  }
}
