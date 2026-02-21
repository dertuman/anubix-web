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
      { error: 'OAuth session expired. Please click "Login with Claude" again to start a new session.' },
      { status: 400 },
    );
  }

  // The code from Anthropic's console page may come as "code#state" — extract just the code
  const authCode = code.trim().split('#')[0];

  // Exchange authorization code for tokens using PKCE
  const tokenRes = await fetch(CLAUDE_TOKEN_URL, {
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

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text().catch(() => '');
    console.error('Claude token exchange failed:', tokenRes.status, errorBody);
    return NextResponse.json(
      { error: 'Token exchange failed. The authorization code may have expired — please try again.' },
      { status: 502 },
    );
  }

  const tokenData = await tokenRes.json();
  if (tokenData.error || !tokenData.access_token) {
    console.error('Claude token response error:', tokenData.error);
    return NextResponse.json(
      { error: tokenData.error_description || tokenData.error || 'Token exchange failed' },
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
