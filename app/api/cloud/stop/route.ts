import { NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { stopFlyMachine } from '@/lib/fly-machines';

/**
 * POST /api/cloud/stop
 *
 * Stop the user's Fly.io machine. Volume is preserved.
 * Cost drops to ~$0 (only volume storage).
 */
export async function POST() {
  try { return await handleStop(); } catch (err) {
    console.error('Unhandled stop error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleStop() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: machine } = await supabase
    .from('cloud_machines')
    .select()
    .eq('email', email)
    .single();

  if (!machine) {
    return NextResponse.json({ error: 'No machine found' }, { status: 404 });
  }
  if (machine.status === 'stopped') {
    return NextResponse.json({ status: 'stopped' });
  }
  if (machine.status !== 'running' && machine.status !== 'error') {
    return NextResponse.json(
      { error: `Cannot stop machine in "${machine.status}" state` },
      { status: 409 },
    );
  }

  if (!machine.fly_machine_id || !machine.fly_app_name) {
    return NextResponse.json({ error: 'Machine has no Fly.io resource IDs' }, { status: 500 });
  }

  try {
    await supabase.from('cloud_machines').update({ status: 'stopping' }).eq('email', email);

    await stopFlyMachine(machine.fly_app_name, machine.fly_machine_id);

    await supabase.from('cloud_machines').update({
      status: 'stopped',
      stopped_at: new Date().toISOString(),
    }).eq('email', email);

    return NextResponse.json({ status: 'stopped' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to stop machine';
    await supabase.from('cloud_machines').update({
      status: 'error',
      error_message: message,
    }).eq('email', email);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
