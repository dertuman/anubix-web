import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('bridge_configs')
    .select()
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ config: null });
  }

  return NextResponse.json({
    config: {
      bridgeUrl: data.bridge_url,
      apiKey: decrypt(data.api_key_encrypted),
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { bridgeUrl, apiKey } = await req.json();
  if (!bridgeUrl) {
    return NextResponse.json({ error: 'bridgeUrl is required' }, { status: 400 });
  }

  // Validate bridge URL to prevent SSRF — only allow HTTPS with public hostnames
  try {
    const parsed = new URL(bridgeUrl);
    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'bridgeUrl must use HTTPS' }, { status: 400 });
    }
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local') || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
      return NextResponse.json({ error: 'bridgeUrl must not point to a private/internal address' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'bridgeUrl is not a valid URL' }, { status: 400 });
  }

  const encrypted = apiKey ? encrypt(apiKey) : '';

  const { error } = await supabase
    .from('bridge_configs')
    .upsert(
      {
        user_id: userId,
        bridge_url: bridgeUrl,
        api_key_encrypted: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Bridge config save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  await supabase.from('bridge_configs').delete().eq('user_id', userId);
  return NextResponse.json({ success: true });
}
