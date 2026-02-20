import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * GET /api/cloud/env-vars
 * Returns all env vars for the authenticated user (values decrypted).
 */
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
    .from('project_env_vars')
    .select()
    .eq('user_id', userId)
    .order('key');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const vars = (data ?? []).map((row) => ({
    key: row.key,
    value: decrypt(row.value_encrypted),
  }));

  return NextResponse.json({ vars });
}

/**
 * PUT /api/cloud/env-vars
 * Upserts a batch of key-value pairs.
 * Body: { vars: [{key: string, value: string}] }
 */
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { vars } = body as { vars: { key: string; value: string }[] };

  if (!Array.isArray(vars)) {
    return NextResponse.json({ error: 'vars must be an array' }, { status: 400 });
  }

  for (const v of vars) {
    if (!v.key || typeof v.key !== 'string') {
      return NextResponse.json({ error: 'Each var must have a key' }, { status: 400 });
    }
  }

  const rows = vars.map((v) => ({
    user_id: userId,
    key: v.key.trim(),
    value_encrypted: encrypt(v.value),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('project_env_vars')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/cloud/env-vars
 * Deletes a single env var by key.
 * Body: { key: string }
 */
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { key } = body as { key: string };

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('project_env_vars')
    .delete()
    .eq('user_id', userId)
    .eq('key', key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
