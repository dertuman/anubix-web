import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/auth/github
 * Initiates GitHub OAuth flow — redirects user to GitHub authorization page.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 503 });
  }

  // Generate random state for CSRF protection
  const state = randomBytes(16).toString('hex');

  // Store the return URL from query param (or default to /profile/integrations)
  // Validate that returnTo is a safe relative path to prevent open redirect attacks
  const rawReturnTo = req.nextUrl.searchParams.get('returnTo') || '/profile/integrations';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/profile/integrations';

  // Build the state cookie value (state + returnTo)
  const statePayload = JSON.stringify({ state, returnTo });

  const callbackUrl = `${req.nextUrl.origin}/api/auth/github/callback`;
  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', clientId);
  githubUrl.searchParams.set('redirect_uri', callbackUrl);
  githubUrl.searchParams.set('scope', 'repo');
  githubUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(githubUrl.toString());
  response.cookies.set('github_oauth_state', statePayload, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
