import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { createSupabaseAdmin } from '@/lib/supabase/server';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email_addresses?: ClerkEmailAddress[];
    primary_email_address_id?: string | null;
    [key: string]: unknown;
  };
}

function extractNameAndEmail(data: WebhookEvent['data']): { name: string; email: string } {
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  const primary = data.email_addresses?.find((e) => e.id === data.primary_email_address_id);
  const email = primary?.email_address ?? data.email_addresses?.[0]?.email_address ?? '';
  return { name, email };
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
    const { name, email } = extractNameAndEmail(evt.data);

    const { error } = await supabase.from('profiles').insert({
      id,
      name,
      email,
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

  if (evt.type === 'user.updated') {
    const { id } = evt.data;
    const { name, email } = extractNameAndEmail(evt.data);

    const { error } = await supabase
      .from('profiles')
      .update({ name, email })
      .eq('id', id);

    if (error) {
      console.error('[webhook] Failed to sync name/email on user.updated:', error);
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

    // First, get the user's email from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single();

    if (!profile?.email) {
      console.error('[webhook] Could not find email for user:', id);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const email = profile.email;

    // Hard-delete all user data from every table using email.
    // Note: Fly.io machine teardown is NOT done here — the webhook must respond
    // quickly and teardown is async. Orphaned machines are caught by the cleanup cron.
    // If deleting via the admin panel, use /api/admin/delete-user which handles Fly.io first.

    // Delete from cloud_machines
    await supabase.from('cloud_machines').delete().eq('email', email);

    // Delete from bridge_configs
    await supabase.from('bridge_configs').delete().eq('email', email);

    // Delete from claude_connections
    await supabase.from('claude_connections').delete().eq('email', email);

    // Delete from github_connections
    await supabase.from('github_connections').delete().eq('email', email);

    // Delete from project_env_vars
    await supabase.from('project_env_vars').delete().eq('email', email);

    // Delete from chat_api_keys
    await supabase.from('chat_api_keys').delete().eq('email', email);

    // Delete from conversations
    await supabase.from('conversations').delete().eq('email', email);

    // subscriptions - use email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('subscriptions').delete().eq('email', email);

    // Hard-delete the profile row (not soft-delete — the Clerk user is gone)
    const { error } = await supabase.from('profiles').delete().eq('email', email);

    console.log('[webhook] user.deleted cleanup done:', { id, email, error: error?.message });

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
