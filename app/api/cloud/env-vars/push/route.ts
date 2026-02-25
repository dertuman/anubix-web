import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from '@/lib/encryption';

/**
 * POST /api/cloud/env-vars/push
 * Saves env vars to the database (encrypted, persistent across sessions)
 * AND syncs them to the running Fly machine via the bridge.
 *
 * Body: { vars: Record<string, string>, repo_path?: string }
 *   - vars: key-value pairs to save and sync
 *   - repo_path: optional repo path (defaults to '__global__')
 */
export async function POST(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Parse body
  let vars: Record<string, string>;
  let repoPath: string;
  try {
    const body = await req.json();
    vars = body?.vars;
    repoPath = body?.repo_path || '__global__';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!vars || typeof vars !== 'object' || Array.isArray(vars)) {
    return NextResponse.json({ error: 'vars must be an object of key-value pairs' }, { status: 400 });
  }

  // Step 1: Save to database (encrypted, persistent)
  const rows = Object.entries(vars)
    .filter(([key]) => key.trim())
    .map(([key, value]) => ({
      user_email: email,
      key: key.trim(),
      value_encrypted: encrypt(value),
      repo_path: repoPath,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid variables to save' }, { status: 400 });
  }

  const { error: dbError } = await supabase
    .from('project_env_vars')
    .upsert(rows, { onConflict: 'user_email,repo_path,key' });

  if (dbError) {
    return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
  }

  // Step 2: Sync to running machine (if one exists)
  const { data: machine } = await supabase
    .from('cloud_machines')
    .select()
    .eq('user_email', email)
    .single();

  // If no running machine, that's OK — vars are saved and will be loaded on next session
  if (!machine || machine.status !== 'running') {
    return NextResponse.json({
      ok: true,
      count: rows.length,
      message: 'Variables saved. They will be available in your next session.',
    });
  }

  if (!machine.bridge_url || !machine.bridge_api_key_encrypted) {
    // Saved to DB but can't sync to machine
    return NextResponse.json({
      ok: true,
      count: rows.length,
      message: 'Variables saved, but could not sync to running machine (missing bridge credentials).',
    });
  }

  let bridgeApiKey: string;
  try {
    bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);
  } catch {
    // Saved to DB but can't decrypt
    return NextResponse.json({
      ok: true,
      count: rows.length,
      message: 'Variables saved, but could not sync to running machine (decryption failed).',
    });
  }

  // Now fetch ALL env vars for this repo (global + repo-specific) to send to bridge
  const { data: allEnvRows } = await supabase
    .from('project_env_vars')
    .select()
    .eq('user_email', email);

  const allRows = allEnvRows ?? [];

  // Build merged vars: global first, then repo-specific override
  const mergedVars: Record<string, string> = {};

  // Add __global__ vars
  for (const row of allRows) {
    if (row.repo_path === '__global__') {
      try {
        mergedVars[row.key] = decrypt(row.value_encrypted);
      } catch {
        // Skip vars that can't be decrypted
      }
    }
  }

  // Then repo-specific vars override
  if (repoPath !== '__global__') {
    for (const row of allRows) {
      if (row.repo_path === repoPath) {
        try {
          mergedVars[row.key] = decrypt(row.value_encrypted);
        } catch {
          // Skip vars that can't be decrypted
        }
      }
    }
  }

  // Sync to bridge
  try {
    const payload: Record<string, unknown> = { vars: mergedVars };
    if (repoPath !== '__global__') {
      payload.repoPath = repoPath;
    }

    const res = await fetch(`${machine.bridge_url}/_bridge/env`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': bridgeApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Saved to DB but sync failed
      return NextResponse.json({
        ok: true,
        count: rows.length,
        warning: `Variables saved, but sync to machine failed: ${text}`,
      });
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      message: 'Variables saved and synced to running machine.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Saved to DB but sync failed
    return NextResponse.json({
      ok: true,
      count: rows.length,
      warning: `Variables saved, but sync to machine failed: ${msg}`,
    });
  }
}
