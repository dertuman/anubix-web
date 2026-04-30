import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

/**
 * GET /api/auth/github/callback
 * Handles the OAuth callback from GitHub.
 */
export async function GET(req: NextRequest) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin));
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/profile/integrations?error=missing_params', req.nextUrl.origin),
    );
  }

  // Validate state against cookie
  const stateCookie = req.cookies.get('github_oauth_state')?.value;
  if (!stateCookie) {
    return NextResponse.redirect(
      new URL('/profile/integrations?error=missing_state', req.nextUrl.origin),
    );
  }

  let statePayload: { state: string; returnTo: string };
  try {
    statePayload = JSON.parse(stateCookie);
  } catch {
    return NextResponse.redirect(
      new URL('/profile/integrations?error=invalid_state', req.nextUrl.origin),
    );
  }

  if (statePayload.state !== state) {
    return NextResponse.redirect(
      new URL('/profile/integrations?error=state_mismatch', req.nextUrl.origin),
    );
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(
      new URL(`/profile/integrations?error=${tokenData.error || 'token_exchange_failed'}`, req.nextUrl.origin),
    );
  }

  const accessToken: string = tokenData.access_token;
  const scopes: string = tokenData.scope || 'repo';

  // Fetch GitHub user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(
      new URL('/profile/integrations?error=github_user_fetch_failed', req.nextUrl.origin),
    );
  }

  const ghUser = await userRes.json();

  // Save to database
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.redirect(
      new URL('/profile/integrations?error=db_not_configured', req.nextUrl.origin),
    );
  }

  const { error: upsertErr } = await supabase.from('github_connections').upsert(
    {
      email: email,
      github_user_id: ghUser.id,
      github_username: ghUser.login,
      access_token_encrypted: encrypt(accessToken),
      scopes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' },
  );

  if (upsertErr) {
    console.error('GitHub connection upsert error:', upsertErr);
    return NextResponse.redirect(
      new URL('/profile/integrations?error=db_save_failed', req.nextUrl.origin),
    );
  }

  // Clear state cookie and redirect
  // Validate returnTo is a safe relative path to prevent open redirect attacks
  const rawReturnTo = statePayload.returnTo || '/profile/integrations';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/profile/integrations';
  const response = NextResponse.redirect(new URL(returnTo, req.nextUrl.origin));
  response.cookies.delete('github_oauth_state');
  return response;
}
