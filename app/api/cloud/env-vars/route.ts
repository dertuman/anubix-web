import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * GET /api/cloud/env-vars
 * Returns env vars for the authenticated user.
 * Optional query param: ?repo_path=<name> to filter by repo.
 * Response includes repo_path for each var.
 */
export async function GET(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const repoPath = req.nextUrl.searchParams.get('repo_path');

  let query = supabase
    .from('project_env_vars')
    .select()
    .eq('email', email)
    .order('key');

  if (repoPath) {
    query = query.eq('repo_path', repoPath);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const vars: { key: string; value: string; repo_path: string }[] = [];
  for (const row of data ?? []) {
    try {
      vars.push({
        key: row.key,
        value: decrypt(row.value_encrypted),
        repo_path: row.repo_path ?? '__global__',
      });
    } catch {
      // Skip vars that can't be decrypted (e.g. encrypted with a different key)
      vars.push({
        key: row.key,
        value: '',
        repo_path: row.repo_path ?? '__global__',
      });
    }
  }

  return NextResponse.json({ vars });
}

/**
 * PUT /api/cloud/env-vars
 * Upserts a batch of key-value pairs.
 * Body: { vars: [{key: string, value: string}], repo_path?: string }
 */
export async function PUT(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { vars, repo_path } = body as {
    vars: { key: string; value: string }[];
    repo_path?: string;
  };
  const repoPath = repo_path || '__global__';

  if (!Array.isArray(vars)) {
    return NextResponse.json({ error: 'vars must be an array' }, { status: 400 });
  }

  for (const v of vars) {
    if (!v.key || typeof v.key !== 'string') {
      return NextResponse.json({ error: 'Each var must have a key' }, { status: 400 });
    }
  }

  const rows = vars.map((v) => ({
    email: email,
    key: v.key.trim(),
    value_encrypted: encrypt(v.value),
    repo_path: repoPath,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('project_env_vars')
    .upsert(rows, { onConflict: 'email,repo_path,key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/cloud/env-vars
 * Deletes a single env var by key.
 * Body: { key: string, repo_path?: string }
 */
export async function DELETE(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { key, repo_path } = body as { key: string; repo_path?: string };
  const repoPath = repo_path || '__global__';

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('project_env_vars')
    .delete()
    .eq('email', email)
    .eq('repo_path', repoPath)
    .eq('key', key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
