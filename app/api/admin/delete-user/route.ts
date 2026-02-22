import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { teardownFlyResources } from '@/lib/fly-machines';

/**
 * POST /api/admin/delete-user
 *
 * Full user nuke:
 *   1. Tears down Fly.io machine (best-effort)
 *   2. Hard-deletes all DB rows across every table
 *   3. Deletes the user from Clerk
 *
 * The Clerk deletion fires the user.deleted webhook, which will try to clean up
 * DB rows again — safe because the rows are already gone (no-op).
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

    // Verify requester is admin
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

    // Prevent self-deletion
    if (userId === requesterId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // ── Step 1: Tear down Fly.io (best-effort) ──────────────────
    const { data: machine } = await supabase
      .from('cloud_machines')
      .select('fly_app_name, fly_machine_id')
      .eq('user_id', userId)
      .single();

    if (machine?.fly_app_name) {
      try {
        await supabase.from('cloud_machines').update({ status: 'destroying' }).eq('user_id', userId);
        await teardownFlyResources(machine.fly_app_name, machine.fly_machine_id ?? undefined);
      } catch (flyErr) {
        console.warn('[admin/delete-user] Fly.io teardown failed (continuing):', flyErr);
      }
    }

    // ── Step 2: Delete all DB rows ───────────────────────────────
    const userIdTables = [
      'cloud_machines',
      'bridge_configs',
      'claude_connections',
      'github_connections',
      'project_env_vars',
      'subscriptions',
    ] as const;

    for (const table of userIdTables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) console.warn(`[admin/delete-user] Failed to delete from ${table}:`, error.message);
    }

    // chat_api_keys uses clerk_user_id instead of user_id
    await supabase.from('chat_api_keys').delete().eq('clerk_user_id', userId);

    // Hard-delete the profile last (webhook will try to delete it again — safe no-op)
    await supabase.from('profiles').delete().eq('id', userId);

    // ── Step 3: Delete from Clerk ────────────────────────────────
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);
    } catch (clerkErr) {
      console.error('[admin/delete-user] Clerk deletion failed:', clerkErr);
      return NextResponse.json(
        { error: 'DB data deleted but Clerk user deletion failed. Delete manually from the Clerk dashboard.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[admin/delete-user] Unhandled error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
