import { NextResponse } from 'next/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getAuthEmail } from '@/lib/auth-utils';
import { decrypt } from '@/lib/encryption';
import {
  getMachineStatus,
  startFlyMachine,
  stopFlyMachine,
  updateFlyMachine,
  waitForBridgeHealth,
  waitForMachineState,
} from '@/lib/fly-machines';

// Stop → image swap → start → health check. Image pull dominates.
export const maxDuration = 300;

/**
 * POST /api/admin/update-machine
 *
 * Updates a user's Fly.io machine to the latest bridge Docker image
 * without touching the mounted volume. Sessions, repos, and all data
 * under /workspace survive untouched.
 *
 * Body: { userId: string }
 */
export async function POST(req: Request) {
  try {
    const requesterEmail = await getAuthEmail();
    if (!requesterEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: requester } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('email', requesterEmail)
      .single();

    if (!requester?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = (await req.json()) as { userId?: string };
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!targetUser?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const email = targetUser.email;

    const { data: machine } = await supabase
      .from('cloud_machines')
      .select()
      .eq('email', email)
      .single();

    if (!machine || !machine.fly_app_name || !machine.fly_machine_id) {
      return NextResponse.json({ error: 'No machine to update' }, { status: 404 });
    }

    if (machine.status === 'destroying' || machine.status === 'destroyed') {
      return NextResponse.json(
        { error: `Cannot update machine in "${machine.status}" state` },
        { status: 409 },
      );
    }

    const newImage = process.env.BRIDGE_DOCKER_IMAGE;
    if (!newImage) {
      return NextResponse.json({ error: 'BRIDGE_DOCKER_IMAGE is not set' }, { status: 500 });
    }

    await supabase.from('cloud_machines').update({ status: 'starting' }).eq('email', email);

    try {
      const flyState = await getMachineStatus(machine.fly_app_name, machine.fly_machine_id);

      // Stop first — Fly requires a stopped machine for config updates.
      if (flyState.state === 'started' || flyState.state === 'starting') {
        await stopFlyMachine(machine.fly_app_name, machine.fly_machine_id);
        await waitForMachineState(machine.fly_app_name, machine.fly_machine_id, 'stopped', 60);
      } else if (flyState.state === 'stopping') {
        await waitForMachineState(machine.fly_app_name, machine.fly_machine_id, 'stopped', 60);
      }

      // Image-only patch — Fly merges at top level, so env/mounts/guest/services survive.
      await updateFlyMachine(machine.fly_app_name, machine.fly_machine_id, {
        image: newImage,
      });

      await startFlyMachine(machine.fly_app_name, machine.fly_machine_id);
      await waitForMachineState(machine.fly_app_name, machine.fly_machine_id, 'started', 120);

      const bridgeApiKey = machine.bridge_api_key_encrypted
        ? decrypt(machine.bridge_api_key_encrypted)
        : '';
      await waitForBridgeHealth(machine.bridge_url!, bridgeApiKey);

      // Re-push Claude credentials so the fresh bridge process has them in memory.
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
        console.error('[admin/update-machine] Failed to re-push credentials:', credErr);
      }

      await supabase
        .from('cloud_machines')
        .update({
          status: 'running',
          stopped_at: null,
          error_message: null,
          last_health_check_at: new Date().toISOString(),
        })
        .eq('email', email);

      return NextResponse.json({ success: true, userId, email, image: newImage });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      console.error('[admin/update-machine] Update flow failed:', err);
      await supabase
        .from('cloud_machines')
        .update({ status: 'error', error_message: message })
        .eq('email', email);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[admin/update-machine] Unhandled error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
