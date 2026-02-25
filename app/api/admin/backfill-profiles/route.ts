import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getAuthEmail } from '@/lib/auth-utils';

/**
 * POST /api/admin/backfill-profiles
 *
 * One-time backfill: fetches every user from Clerk and upserts their
 * name + email into the profiles table. Safe to run multiple times.
 */
export async function POST() {
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

    // ── Fetch all users from Clerk (paginated) ────────────────
    const clerk = await clerkClient();
    const allClerkUsers: { id: string; name: string; email: string }[] = [];
    const LIMIT = 500;
    let offset = 0;

    while (true) {
      const page = await clerk.users.getUserList({ limit: LIMIT, offset });

      for (const u of page.data) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId);
        const email = primary?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? '';
        allClerkUsers.push({ id: u.id, name, email });
      }

      if (page.data.length < LIMIT) break;
      offset += LIMIT;
    }

    // ── Update profiles in Supabase ───────────────────────────
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 50 to avoid hammering the DB
    const BATCH = 50;
    for (let i = 0; i < allClerkUsers.length; i += BATCH) {
      const batch = allClerkUsers.slice(i, i + BATCH);

      await Promise.all(
        batch.map(async ({ id, name, email }) => {
          const { error } = await supabase
            .from('profiles')
            .update({ name, email })
            .eq('id', id);

          if (error) {
            // Profile may not exist yet (race condition) — skip silently
            skipped++;
            errors.push(`${id}: ${error.message}`);
          } else {
            updated++;
          }
        }),
      );
    }

    console.log(`[backfill-profiles] Done. updated=${updated} skipped=${skipped} total=${allClerkUsers.length}`);

    return NextResponse.json({
      success: true,
      total: allClerkUsers.length,
      updated,
      skipped,
      ...(errors.length > 0 && { errors }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[backfill-profiles] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
