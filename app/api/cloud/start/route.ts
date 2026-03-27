import { NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { checkSubscriptionOrAdmin } from '@/lib/check-subscription';

// Allow up to 60s for machine restart + health check
export const maxDuration = 60;
import {
  getMachineStatus,
  updateFlyMachine,
  startFlyMachine,
  waitForMachineState,
  waitForBridgeHealth,
} from '@/lib/fly-machines';

/**
 * POST /api/cloud/start
 *
 * Resume a stopped Fly.io machine.
 */
export async function POST() {
  try { return await handleStart(); } catch (err) {
    console.error('Unhandled start error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleStart() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // ── Check subscription (admins bypass) ─────────────────────
  const subCheck = await checkSubscriptionOrAdmin(supabase, email);
  if (!subCheck.allowed) {
    return NextResponse.json(
      { error: subCheck.reason, code: 'SUBSCRIPTION_REQUIRED' },
      { status: 403 },
    );
  }

  const { data: machine } = await supabase
    .from('cloud_machines')
    .select()
    .eq('email', email)
    .single();

  if (!machine) {
    return NextResponse.json({ error: 'No machine found' }, { status: 404 });
  }
  if (machine.status === 'running') {
    const bridgeApiKey = machine.bridge_api_key_encrypted
      ? decrypt(machine.bridge_api_key_encrypted)
      : '';
    return NextResponse.json({
      bridgeUrl: machine.bridge_url,
      bridgeApiKey,
      previewUrl: machine.bridge_url,
      status: 'running',
    });
  }
  if (machine.status !== 'stopped') {
    return NextResponse.json(
      { error: `Cannot start machine in "${machine.status}" state` },
      { status: 409 },
    );
  }

  if (!machine.fly_machine_id || !machine.fly_app_name) {
    return NextResponse.json({ error: 'Machine has no Fly.io resource IDs' }, { status: 500 });
  }

  try {
    await supabase.from('cloud_machines').update({ status: 'starting' }).eq('email', email);

    // Check actual Fly machine state before attempting start
    const flyState = await getMachineStatus(machine.fly_app_name, machine.fly_machine_id);

    // Migrate existing machines: add env vars so data persists on volume
    if (flyState.state === 'stopped') {
      const existingEnv = (flyState.config?.env as Record<string, string>) ?? {};
      const needsDataDir = !existingEnv.DATA_DIR;
      const needsClaudeConfig = !existingEnv.CLAUDE_CONFIG_DIR;
      if (needsDataDir || needsClaudeConfig) {
        try {
          await updateFlyMachine(machine.fly_app_name, machine.fly_machine_id, {
            env: {
              ...existingEnv,
              ...(needsDataDir ? { DATA_DIR: '/workspace/.bridge-data' } : {}),
              ...(needsClaudeConfig ? { CLAUDE_CONFIG_DIR: '/workspace/.claude-config' } : {}),
            },
          });
        } catch (err) {
          console.error('Failed to migrate env vars:', err);
          // Non-fatal — continue with start
        }
      }
    }

    if (flyState.state === 'started') {
      // Already running — skip start, go straight to health check
    } else if (flyState.state === 'stopping') {
      // Wait for stop to complete, then start
      await waitForMachineState(machine.fly_app_name, machine.fly_machine_id, 'stopped', 30);
      await startFlyMachine(machine.fly_app_name, machine.fly_machine_id);
      await waitForMachineState(machine.fly_app_name, machine.fly_machine_id, 'started', 60);
    } else {
      await startFlyMachine(machine.fly_app_name, machine.fly_machine_id);
      await waitForMachineState(machine.fly_app_name, machine.fly_machine_id, 'started', 60);
    }

    const bridgeApiKey = machine.bridge_api_key_encrypted
      ? decrypt(machine.bridge_api_key_encrypted)
      : '';
    await waitForBridgeHealth(machine.bridge_url!, bridgeApiKey);

    // Re-push Claude credentials from DB to bridge after resume.
    // Credentials may have been updated since provisioning (OAuth refresh, etc.)
    try {
      const { data: claudeConn } = await supabase
        .from('claude_connections')
        .select()
        .eq('email', email)
        .single();

      if (claudeConn) {
        const claudeMode = claudeConn.claude_mode as 'cli' | 'sdk';
        const credPayload: Record<string, string> = { claudeMode };

        if (claudeMode === 'cli' && claudeConn.auth_json_encrypted) {
          credPayload.claudeAuthJson = decrypt(claudeConn.auth_json_encrypted);
        }
        if (claudeMode === 'sdk' && claudeConn.api_key_encrypted) {
          credPayload.anthropicApiKey = decrypt(claudeConn.api_key_encrypted);
        }

        await fetch(`${machine.bridge_url}/_bridge/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': bridgeApiKey,
          },
          body: JSON.stringify(credPayload),
        });
      }
    } catch (credErr) {
      // Non-fatal: machine is running, credentials can be pushed manually later
      console.error('Failed to push credentials on resume:', credErr);
    }

    await supabase.from('cloud_machines').update({
      status: 'running',
      stopped_at: null,
      last_health_check_at: new Date().toISOString(),
    }).eq('email', email);

    return NextResponse.json({
      bridgeUrl: machine.bridge_url,
      bridgeApiKey,
      previewUrl: machine.bridge_url,
      status: 'running',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start machine';
    await supabase.from('cloud_machines').update({
      status: 'error',
      error_message: message,
    }).eq('email', email);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
