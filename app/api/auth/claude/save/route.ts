import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

/**
 * POST /api/auth/claude/save
 * Saves Claude credentials (CLI JSON or API key) for the current user.
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

  const body = await req.json();
  const { claudeMode, claudeAuthJson, anthropicApiKey } = body as {
    claudeMode: 'cli' | 'sdk';
    claudeAuthJson?: string;
    anthropicApiKey?: string;
  };

  if (claudeMode === 'cli' && !claudeAuthJson) {
    return NextResponse.json({ error: 'claudeAuthJson is required for CLI mode' }, { status: 400 });
  }
  if (claudeMode === 'sdk' && !anthropicApiKey) {
    return NextResponse.json({ error: 'anthropicApiKey is required for SDK mode' }, { status: 400 });
  }

  const row = {
    user_email: email,
    claude_mode: claudeMode,
    auth_json_encrypted: claudeAuthJson ? encrypt(claudeAuthJson) : null,
    api_key_encrypted: anthropicApiKey ? encrypt(anthropicApiKey) : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('claude_connections')
    .upsert(row, { onConflict: 'user_email' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
