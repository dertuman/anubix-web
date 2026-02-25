import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('bridge_configs')
    .select()
    .eq('email', email)
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
  const email = await getAuthEmail();
  if (!email) {
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

  const encrypted = apiKey ? encrypt(apiKey) : '';

  const { error } = await supabase
    .from('bridge_configs')
    .upsert(
      {
        email,
        bridge_url: bridgeUrl,
        api_key_encrypted: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

  if (error) {
    console.error('Bridge config save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  await supabase.from('bridge_configs').delete().eq('email', email);
  return NextResponse.json({ success: true });
}
