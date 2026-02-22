import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { teardownFlyResources } from '@/lib/fly-machines';

/**
 * POST /api/cloud/destroy
 *
 * Fully tear down all Fly.io resources (machine + volume + app)
 * and delete the database rows. User can provision fresh afterwards.
 */
export async function POST() {
  try { return await handleDestroy(); } catch (err) {
    console.error('Unhandled destroy error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleDestroy() {
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

  try {
    await supabase.from('cloud_machines').update({ status: 'destroying' }).eq('user_id', userId);

    // Best-effort teardown of Fly.io resources
    await teardownFlyResources(machine.fly_app_name, machine.fly_machine_id);

    // Delete the cloud_machines row
    await supabase.from('cloud_machines').delete().eq('user_id', userId);

    // Also clean up bridge_configs if it points to this machine
    if (machine.bridge_url) {
      const { data: bridgeConfig } = await supabase
        .from('bridge_configs')
        .select()
        .eq('user_id', userId)
        .single();

      if (bridgeConfig?.bridge_url === machine.bridge_url) {
        await supabase.from('bridge_configs').delete().eq('user_id', userId);
      }
    }

    return NextResponse.json({ status: 'destroyed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to destroy machine';
    console.error('Destroy failed:', message);

    // Still try to delete the DB row so user isn't stuck
    await supabase.from('cloud_machines').delete().eq('user_id', userId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
