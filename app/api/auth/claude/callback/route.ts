import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

const CLAUDE_OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const CLAUDE_TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token';
const CLAUDE_REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';

/**
 * POST /api/auth/claude/callback
 * Exchanges an authorization code (pasted by the user) for OAuth tokens.
 * Reads the PKCE verifier from the httpOnly cookie set during /api/auth/claude.
 */
export async function POST(req: NextRequest) {
  try { return await handleCallback(req); } catch (err) {
    console.error('Unhandled error in claude callback:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCallback(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const body = await req.json();
  const { code } = body as { code?: string };

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
  }

  // Read PKCE verifier from cookie
  const codeVerifier = req.cookies.get('claude_oauth_pkce')?.value;
  if (!codeVerifier) {
    return NextResponse.json(
      { error: 'OAuth session expired — the PKCE cookie was not found. Please click "Start over" and try again.' },
      { status: 400 },
    );
  }

  // Clean the pasted code: strip whitespace, trailing backslashes, and #state suffix
  const authCode = code.trim().replace(/\\+$/, '').split('#')[0];

  console.log('[claude-callback] Exchanging code (length=%d, verifier length=%d)', authCode.length, codeVerifier.length);

  // Exchange authorization code for tokens using PKCE
  let tokenRes: Response;
  try {
    tokenRes = await fetch(CLAUDE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: CLAUDE_REDIRECT_URI,
        client_id: CLAUDE_OAUTH_CLIENT_ID,
        code_verifier: codeVerifier,
      }).toString(),
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
    console.error('Claude token response not JSON:', tokenRes.status, tokenBody);
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

  // Build credentials JSON in the format that init-workspace.sh and Claude Code CLI expect
  const authJson = JSON.stringify({
    claudeAiOauth: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    },
  });

  // Save to database
  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { error: upsertErr } = await supabase.from('claude_connections').upsert(
    {
      user_id: userId,
      claude_mode: 'cli',
      auth_json_encrypted: encrypt(authJson),
      api_key_encrypted: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (upsertErr) {
    console.error('Claude connection upsert error:', upsertErr);
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }

  // Clear PKCE cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('claude_oauth_pkce');
  return response;
}
