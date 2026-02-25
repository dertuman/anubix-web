import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

const CLAUDE_OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const CLAUDE_TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';
const CLAUDE_REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';
const CLAUDE_SCOPE = 'org:create_api_key user:profile user:inference';

/**
 * POST /api/auth/claude/callback
 * Exchanges an authorization code for OAuth tokens.
 * Uses JSON body matching the format expected by Anthropic's token endpoint.
 */
export async function POST(req: NextRequest) {
  try { return await handleCallback(req); } catch (err) {
    console.error('Unhandled error in claude callback:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCallback(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const body = await req.json();
  const { code } = body as { code?: string };

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
  }

  // Read PKCE verifier and state from cookies
  const codeVerifier = req.cookies.get('claude_oauth_pkce')?.value;
  const storedState = req.cookies.get('claude_oauth_state')?.value;

  if (!codeVerifier) {
    return NextResponse.json(
      { error: 'OAuth session expired — please click "Start over" and try again.' },
      { status: 400 },
    );
  }

  // Parse "code#state" format — Anthropic returns state after #
  const cleaned = code.trim().replace(/\\+$/, '');
  const hashIdx = cleaned.indexOf('#');
  const authCode = hashIdx >= 0 ? cleaned.slice(0, hashIdx) : cleaned;
  // Use state from pasted code if present, otherwise fall back to stored state
  const state = (hashIdx >= 0 ? cleaned.slice(hashIdx + 1) : null) || storedState || '';

  // Exchange authorization code for tokens (JSON body matching anthropic-auth library)
  let tokenRes: Response;
  try {
    tokenRes = await fetch(CLAUDE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: authCode,
        state,
        grant_type: 'authorization_code',
        client_id: CLAUDE_OAUTH_CLIENT_ID,
        redirect_uri: CLAUDE_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
  } catch (fetchErr) {
    console.error('Failed to reach Anthropic token endpoint:', fetchErr);
    return NextResponse.json(
      { error: 'Could not reach Anthropic servers. Please check your network and try again.' },
      { status: 502 },
    );
  }

  const tokenBody = await tokenRes.text().catch(() => '');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tokenData: any;
  try {
    tokenData = JSON.parse(tokenBody);
  } catch {
    console.error('Claude token response not JSON:', tokenRes.status, tokenBody.slice(0, 500));
    return NextResponse.json(
      { error: 'Anthropic returned an unexpected response. Please try again.' },
      { status: 502 },
    );
  }

  if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
    console.error('Claude token exchange failed:', tokenRes.status, tokenBody);

    const errObj = tokenData.error;
    const detail =
      tokenData.error_description ||
      (typeof errObj === 'string' ? errObj : errObj?.message || errObj?.type) ||
      'Unknown error';

    return NextResponse.json(
      { error: `Claude login failed: ${detail}. Please click "Start over" and try again.` },
      { status: 502 },
    );
  }

  // Build credentials JSON in the format that Claude Code CLI expects.
  // CRITICAL: Must include `scopes` — the CLI checks Bg(K?.scopes) && K?.accessToken
  // and rejects credentials without a valid scopes array.
  // Must include `expiresAt` — CLI uses it to proactively refresh tokens.
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString(); // default 1h

  const authJson = JSON.stringify({
    claudeAiOauth: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scopes: CLAUDE_SCOPE.split(' '),
    },
  });

  // Save to database
  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { error: upsertErr } = await supabase.from('claude_connections').upsert(
    {
      user_email: email,
      claude_mode: 'cli',
      auth_json_encrypted: encrypt(authJson),
      api_key_encrypted: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_email' },
  );

  if (upsertErr) {
    console.error('Claude connection upsert error:', upsertErr);
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }

  // Clear OAuth cookies
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('claude_oauth_pkce');
  response.cookies.delete('claude_oauth_state');
  return response;
}
