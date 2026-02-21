import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

/**
 * GET /api/auth/claude/callback
 * Handles the OAuth callback from Claude — exchanges code for tokens via PKCE.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin));
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');

  // Handle OAuth provider errors (e.g. user denied access)
  if (errorParam) {
    return redirectWithError(req, '/code', errorParam);
  }

  if (!code || !state) {
    return redirectWithError(req, '/code', 'missing_params');
  }

  // Validate state against cookie
  const stateCookie = req.cookies.get('claude_oauth_state')?.value;
  if (!stateCookie) {
    return redirectWithError(req, '/code', 'missing_state');
  }

  let statePayload: { state: string; returnTo: string; codeVerifier: string };
  try {
    statePayload = JSON.parse(stateCookie);
  } catch {
    return redirectWithError(req, '/code', 'invalid_state');
  }

  if (statePayload.state !== state) {
    return redirectWithError(req, '/code', 'state_mismatch');
  }

  // Validate returnTo is a safe relative path
  const rawReturnTo = statePayload.returnTo || '/code';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/code';

  // Exchange authorization code for tokens using PKCE (no client_secret needed)
  const clientId = process.env.CLAUDE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return redirectWithError(req, returnTo, 'oauth_not_configured');
  }

  const callbackUrl = `${req.nextUrl.origin}/api/auth/claude/callback`;

  const tokenRes = await fetch('https://claude.ai/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      code_verifier: statePayload.codeVerifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text().catch(() => '');
    console.error('Claude token exchange failed:', tokenRes.status, errorBody);
    return redirectWithError(req, returnTo, 'token_exchange_failed');
  }

  const tokenData = await tokenRes.json();
  if (tokenData.error || !tokenData.access_token) {
    console.error('Claude token response error:', tokenData.error);
    return redirectWithError(req, returnTo, tokenData.error || 'token_exchange_failed');
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
    return redirectWithError(req, returnTo, 'db_not_configured');
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
    return redirectWithError(req, returnTo, 'db_save_failed');
  }

  // Clear state cookie and redirect to the return URL
  const response = NextResponse.redirect(new URL(returnTo, req.nextUrl.origin));
  response.cookies.delete('claude_oauth_state');
  return response;
}

/** Helper to redirect with an error query parameter */
function redirectWithError(req: NextRequest, path: string, error: string): NextResponse {
  const url = new URL(path, req.nextUrl.origin);
  url.searchParams.set('error', error);
  const response = NextResponse.redirect(url);
  response.cookies.delete('claude_oauth_state');
  return response;
}
