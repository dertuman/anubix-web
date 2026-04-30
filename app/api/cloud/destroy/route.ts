import { NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createSupabaseAdmin } from '@/lib/supabase/server';
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

  try {
    await supabase.from('cloud_machines').update({ status: 'destroying' }).eq('email', email);

    // Best-effort teardown of Fly.io resources
    await teardownFlyResources(machine.fly_app_name, machine.fly_machine_id);
  } catch (err) {
    console.error('Fly.io teardown failed (continuing with DB cleanup):', err);
  }

  // Always clean up all machine-related DB rows so the user isn't stuck
  try {
    await supabase.from('cloud_machines').delete().eq('email', email);
    await supabase.from('bridge_configs').delete().eq('email', email);
    await supabase.from('claude_connections').delete().eq('email', email);
    await supabase.from('github_connections').delete().eq('email', email);
    await supabase.from('project_env_vars').delete().eq('email', email);

    return NextResponse.json({ status: 'destroyed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clean up database rows';
    console.error('Destroy DB cleanup failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
