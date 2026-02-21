import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/auth/claude
 * Initiates Claude OAuth flow with PKCE — redirects user to claude.ai authorization page.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const clientId = process.env.CLAUDE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Claude OAuth not configured' }, { status: 503 });
  }

  // Generate random state for CSRF protection
  const state = randomBytes(16).toString('hex');

  // Generate PKCE code verifier and challenge (RFC 7636)
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

  // Store the return URL from query param (or default to /code)
  // Validate that returnTo is a safe relative path to prevent open redirect attacks
  const rawReturnTo = req.nextUrl.searchParams.get('returnTo') || '/code';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/code';

  // Build the state cookie value (state + returnTo + PKCE verifier)
  const statePayload = JSON.stringify({ state, returnTo, codeVerifier });

  const callbackUrl = `${req.nextUrl.origin}/api/auth/claude/callback`;
  const claudeUrl = new URL('https://claude.ai/oauth/authorize');
  claudeUrl.searchParams.set('response_type', 'code');
  claudeUrl.searchParams.set('client_id', clientId);
  claudeUrl.searchParams.set('redirect_uri', callbackUrl);
  claudeUrl.searchParams.set('scope', 'user:inference user:profile');
  claudeUrl.searchParams.set('state', state);
  claudeUrl.searchParams.set('code_challenge', codeChallenge);
  claudeUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(claudeUrl.toString());
  response.cookies.set('claude_oauth_state', statePayload, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
