import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * POST /api/cloud/env-vars/sync
 * Pushes the user's env vars to their running Fly machine via the bridge.
 *
 * Body (optional): { repo_path?: string }
 *   - If repo_path provided: merges __global__ + repo-specific vars (repo wins)
 *     and sends to bridge with { vars, repoPath }.
 *   - If no repo_path: fetches all distinct repo paths, syncs each one.
 */
export async function POST(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Parse optional body
  let repoPath: string | undefined;
  try {
    const body = await req.json();
    repoPath = body?.repo_path;
  } catch {
    // No body or invalid JSON — that's fine, sync all
  }

  // Fetch user's cloud machine for bridge URL + API key
  const { data: machine } = await supabase
    .from('cloud_machines')
    .select()
    .eq('email', email)
    .single();

  if (!machine || machine.status !== 'running') {
    return NextResponse.json({ error: 'No running machine found' }, { status: 404 });
  }

  if (!machine.bridge_url || !machine.bridge_api_key_encrypted) {
    return NextResponse.json({ error: 'Machine missing bridge credentials' }, { status: 500 });
  }

  let bridgeApiKey: string;
  try {
    bridgeApiKey = decrypt(machine.bridge_api_key_encrypted);
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt bridge credentials — encryption key may have changed' }, { status: 500 });
  }

  // Fetch all env vars for user
  const { data: envRows, error: envErr } = await supabase
    .from('project_env_vars')
    .select()
    .eq('email', email);

  if (envErr) {
    return NextResponse.json({ error: envErr.message }, { status: 500 });
  }

  const allRows = envRows ?? [];

  // Helper: merge global + repo-specific vars → Record<string, string>
  const buildVars = (targetRepo: string): Record<string, string> => {
    const vars: Record<string, string> = {};
    // First, add __global__ vars
    for (const row of allRows) {
      if (row.repo_path === '__global__') {
        try {
          vars[row.key] = decrypt(row.value_encrypted);
        } catch {
          // Skip vars that can't be decrypted
        }
      }
    }
    // Then, repo-specific vars override globals
    if (targetRepo !== '__global__') {
      for (const row of allRows) {
        if (row.repo_path === targetRepo) {
          try {
            vars[row.key] = decrypt(row.value_encrypted);
          } catch {
            // Skip vars that can't be decrypted
          }
        }
      }
    }
    return vars;
  };

  // Helper: push vars to bridge
  const pushToBridge = async (vars: Record<string, string>, bridgeRepoPath?: string) => {
    const payload: Record<string, unknown> = { vars };
    if (bridgeRepoPath && bridgeRepoPath !== '__global__') {
      payload.repoPath = bridgeRepoPath;
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
      throw new Error(`Bridge returned ${res.status}: ${text}`);
    }
    return Object.keys(vars).length;
  };

  try {
    if (repoPath) {
      // Sync a single repo
      const vars = buildVars(repoPath);
      const count = await pushToBridge(vars, repoPath);
      return NextResponse.json({ ok: true, count });
    }

    // Sync all distinct repo paths
    const repoPaths = new Set<string>();
    for (const row of allRows) {
      repoPaths.add(row.repo_path ?? '__global__');
    }

    // If there are only __global__ vars, still do a single sync
    if (repoPaths.size === 0 || (repoPaths.size === 1 && repoPaths.has('__global__'))) {
      const vars = buildVars('__global__');
      const count = await pushToBridge(vars);
      return NextResponse.json({ ok: true, count });
    }

    // Otherwise, sync each non-global repo (globals are merged in)
    let totalCount = 0;
    for (const rp of repoPaths) {
      if (rp === '__global__') continue;
      const vars = buildVars(rp);
      totalCount += await pushToBridge(vars, rp);
    }

    return NextResponse.json({ ok: true, count: totalCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
