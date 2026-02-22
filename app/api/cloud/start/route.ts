import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

// Allow up to 60s for machine restart + health check
export const maxDuration = 60;
import {
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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: machine } = await supabase
    .from('cloud_machines')
    .select()
    .eq('user_id', userId)
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
    await supabase.from('cloud_machines').update({ status: 'starting' }).eq('user_id', userId);

    await startFlyMachine(machine.fly_app_name, machine.fly_machine_id);
    await waitForMachineState(machine.fly_app_name, machine.fly_machine_id, 'started', 60);

    const bridgeApiKey = machine.bridge_api_key_encrypted
      ? decrypt(machine.bridge_api_key_encrypted)
      : '';
    await waitForBridgeHealth(machine.bridge_url!, bridgeApiKey);

    await supabase.from('cloud_machines').update({
      status: 'running',
      stopped_at: null,
      last_health_check_at: new Date().toISOString(),
    }).eq('user_id', userId);

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
    }).eq('user_id', userId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
