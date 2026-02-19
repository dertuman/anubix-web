import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';
import {
  createFlyApp,
  createFlyVolume,
  createFlyMachine,
  startFlyMachine,
  waitForMachineState,
  waitForBridgeHealth,
  teardownFlyResources,
} from '@/lib/fly-machines';

/**
 * POST /api/cloud/provision
 *
 * One-click provisioning: creates a Fly.io app + volume + machine
 * running the anubix-bridge Docker image. Returns the bridge URL
 * and API key so the client can auto-connect.
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

  // ── Parse request ──────────────────────────────────────────
  const body = await req.json();
  const {
    claudeMode = 'cli',
    claudeAuthJson,
    anthropicApiKey,
    templateName,
    gitRepoUrl,
    region = 'lhr',
  } = body as {
    claudeMode?: 'cli' | 'sdk';
    claudeAuthJson?: string;
    anthropicApiKey?: string;
    templateName?: string;
    gitRepoUrl?: string;
    region?: string;
  };

  // Validate auth credentials
  if (claudeMode === 'cli' && !claudeAuthJson) {
    return NextResponse.json({ error: 'claudeAuthJson is required for CLI mode' }, { status: 400 });
  }
  if (claudeMode === 'sdk' && !anthropicApiKey) {
    return NextResponse.json({ error: 'anthropicApiKey is required for SDK mode' }, { status: 400 });
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
        previewUrl: existing.bridge_url ? `${existing.bridge_url}/preview/` : null,
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

    // 2. Create volume
    const volume = await createFlyVolume(appName, region);
    volumeId = volume.id;

    // 3. Create machine
    const machine = await createFlyMachine(appName, {
      bridgeApiKey,
      claudeMode,
      claudeAuthJson: claudeAuthJson || undefined,
      anthropicApiKey: anthropicApiKey || undefined,
      volumeId,
      templateName: templateName || undefined,
      gitRepoUrl: gitRepoUrl || undefined,
      memoryMb: 512,
    });
    machineId = machine.id;

    // Update DB with Fly.io resource IDs
    await supabase.from('cloud_machines').update({
      fly_machine_id: machineId,
      fly_volume_id: volumeId,
      status: 'starting',
    }).eq('user_id', userId);

    // 4. Wait for machine to start
    await waitForMachineState(appName, machineId, 'started', 60);

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
      previewUrl: `${bridgeUrl}/preview/`,
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
