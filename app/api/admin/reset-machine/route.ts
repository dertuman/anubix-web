import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { teardownFlyResources } from '@/lib/fly-machines';

/**
 * POST /api/admin/reset-machine
 *
 * Destroys a user's Fly.io machine and deletes all machine-related rows:
 *   cloud_machines, bridge_configs, claude_connections, github_connections,
 *   project_env_vars
 *
 * The user's profile, subscriptions, and chat_api_keys are intentionally kept.
 *
 * Body: { userId: string }
 */
export async function POST(req: Request) {
  try {
    const { userId: requesterId } = await auth();
    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify the requester is an admin
    const { data: requester } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', requesterId)
      .single();

    if (!requester?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Look up target user's email from their Clerk ID
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!targetUser?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const email = targetUser.email;

    // Look up the machine record
    const { data: machine } = await supabase
      .from('cloud_machines')
      .select('fly_app_name, fly_machine_id, status')
      .eq('user_email', email)
      .single();

    // Attempt Fly.io teardown (best-effort — don't fail if the machine is already gone)
    if (machine?.fly_app_name) {
      try {
        await supabase
          .from('cloud_machines')
          .update({ status: 'destroying' })
          .eq('user_email', email);

        await teardownFlyResources(machine.fly_app_name, machine.fly_machine_id ?? undefined);
      } catch (flyErr) {
        console.warn('[admin/reset-machine] Fly.io teardown failed (continuing):', flyErr);
      }
    }

    // Delete all machine-related rows using email
    await supabase.from('cloud_machines').delete().eq('user_email', email);
    await supabase.from('bridge_configs').delete().eq('email', email);
    await supabase.from('claude_connections').delete().eq('user_email', email);
    await supabase.from('github_connections').delete().eq('user_email', email);
    await supabase.from('project_env_vars').delete().eq('user_email', email);

    return NextResponse.json({ success: true, userId, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[admin/reset-machine] Unhandled error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
