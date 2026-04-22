import { NextResponse } from 'next/server';

import { getAuthEmail } from '@/lib/auth-utils';
import {
  generateBridgeApiKey,
  generateInstallToken,
  hashInstallToken,
} from '@/lib/bridge-tokens';
import { encrypt } from '@/lib/encryption';
import { createSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/bridge-config/generate
 *
 * Creates (or resets) the authenticated user's local-bridge credentials.
 * Returns the install token and bridge API key in plaintext — the client
 * MUST display them immediately and the user MUST paste them into their
 * bridge .env. After this response, the install token is never recoverable
 * (we only store its hash).
 *
 * Calling this again rotates both secrets and invalidates any bridge that
 * was previously registered with the old install token. The old public URL
 * is cleared so the client doesn't attempt to connect to a stale tunnel.
 */
export async function POST() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  // Admin client — we already validated the caller via Clerk and we scope the
  // write to `email` derived from the authenticated session. RLS isn't helping
  // here, and some setups have JWT-email mismatches that block the insert.
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const installToken = generateInstallToken();
  const bridgeApiKey = generateBridgeApiKey();

  const { error } = await supabase.from('bridge_configs').upsert(
    {
      email,
      bridge_url: null,
      api_key_encrypted: encrypt(bridgeApiKey),
      install_token_hash: hashInstallToken(installToken),
      last_seen_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );

  if (error) {
    console.error('bridge_configs upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Everything else (ANUBIX_WEB_URL, TUNNEL_MODE, CLAUDE_MODE, PORT) has a
  // sensible default inside anubix-bridge — just ship the two secrets.
  const envTemplate = [
    `ANUBIX_INSTALL_TOKEN=${installToken}`,
    `BRIDGE_API_KEY=${bridgeApiKey}`,
  ].join('\n');

  return NextResponse.json({
    installToken,
    bridgeApiKey,
    envTemplate,
  });
}
