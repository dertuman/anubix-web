import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { createSupabaseAdmin } from '@/lib/supabase/server';

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 503 }
    );
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  if (evt.type === 'user.created') {
    const { id } = evt.data;

    const { error } = await supabase.from('profiles').insert({
      id,
      bio: '',
      profile_picture: '',
      font: 'inter',
      theme: 'dark',
      language: 'en',
      is_admin: false,
      is_deleted: false,
    });

    if (error) {
      console.error('Error creating profile:', error);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }
  }

  if (evt.type === 'user.deleted') {
    const { id } = evt.data;

    console.log('[webhook] user.deleted event received for:', id);

    if (!id) {
      console.error('[webhook] user.deleted event has no id in data');
      return NextResponse.json(
        { error: 'No user id in delete event' },
        { status: 400 }
      );
    }

    // Hard-delete all user data from every table.
    // Note: Fly.io machine teardown is NOT done here — the webhook must respond
    // quickly and teardown is async. Orphaned machines are caught by the cleanup cron.
    // If deleting via the admin panel, use /api/admin/delete-user which handles Fly.io first.
    const tables = [
      'cloud_machines',
      'bridge_configs',
      'claude_connections',
      'github_connections',
      'project_env_vars',
      'chat_api_keys',
    ] as const;

    for (const table of tables) {
      const col = table === 'chat_api_keys' ? 'clerk_user_id' : 'user_id';
      const { error: delErr } = await supabase.from(table).delete().eq(col, id);
      if (delErr) console.warn(`[webhook] Failed to delete from ${table}:`, delErr.message);
    }

    // subscriptions is not in the generated types yet — use admin client directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('subscriptions').delete().eq('user_id', id);

    // Hard-delete the profile row (not soft-delete — the Clerk user is gone)
    const { error } = await supabase.from('profiles').delete().eq('id', id);

    console.log('[webhook] user.deleted cleanup done:', { id, error: error?.message });

    if (error) {
      console.error('Error deleting profile:', error);
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
