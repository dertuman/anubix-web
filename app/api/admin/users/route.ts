import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';

async function getAdminClient() {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized', status: 401, supabase: null, userId: null };

  const supabase = createSupabaseAdmin();
  if (!supabase) return { error: 'Database not configured', status: 503, supabase: null, userId: null };

  const { data: requester } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (!requester?.is_admin) return { error: 'Forbidden', status: 403, supabase: null, userId: null };

  return { error: null, status: 200, supabase, userId };
}

/**
 * GET /api/admin/users
 *
 * Returns all non-deleted users with their machine status and connection flags.
 */
export async function GET() {
  try {
    const { error, status, supabase } = await getAdminClient();
    if (error || !supabase) return NextResponse.json({ error }, { status });

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, is_admin, is_deleted, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch all machines (uses user_email)
    const { data: machines } = await supabase
      .from('cloud_machines')
      .select('user_email, status, fly_app_name');

    // Fetch users with Claude connections (uses user_email)
    const { data: claudeRows } = await supabase
      .from('claude_connections')
      .select('user_email');

    // Fetch users with GitHub connections (uses user_email)
    const { data: githubRows } = await supabase
      .from('github_connections')
      .select('user_email');

    const machineByEmail = Object.fromEntries((machines ?? []).map((m) => [m.user_email, m]));
    const claudeSet = new Set((claudeRows ?? []).map((r) => r.user_email));
    const githubSet = new Set((githubRows ?? []).map((r) => r.user_email));

    const users = (profiles ?? []).map((p) => {
      const machine = machineByEmail[p.email];
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        is_admin: p.is_admin,
        is_deleted: p.is_deleted,
        created_at: p.created_at,
        machine_status: machine?.status ?? null,
        fly_app_name: machine?.fly_app_name ?? null,
        has_claude: claudeSet.has(p.email),
        has_github: githubSet.has(p.email),
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 *
 * Updates a user's is_admin flag.
 * Body: { userId: string, is_admin: boolean }
 */
export async function PATCH(req: Request) {
  try {
    const { error, status, supabase, userId: requesterId } = await getAdminClient();
    if (error || !supabase) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const { userId, is_admin } = body as { userId: string; is_admin: boolean };

    if (!userId || typeof is_admin !== 'boolean') {
      return NextResponse.json({ error: 'Missing userId or is_admin' }, { status: 400 });
    }

    // Prevent admins from removing their own admin status
    if (userId === requesterId && !is_admin) {
      return NextResponse.json({ error: 'You cannot remove your own admin access' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
