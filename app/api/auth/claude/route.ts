import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const CLAUDE_OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const CLAUDE_AUTHORIZE_URL = 'https://claude.ai/oauth/authorize';
const CLAUDE_REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';

/**
 * POST /api/auth/claude
 * Generates a PKCE challenge and returns the Claude OAuth authorize URL.
 * The frontend opens this URL in a new tab; the user authorizes and receives
 * a code on Anthropic's console page, then pastes it back.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    // Generate PKCE code verifier and challenge (RFC 7636)
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    // State required by Anthropic for CSRF protection (avoids "Missing state parameter" error)
    const state = randomBytes(24).toString('base64url');

    // Build the authorization URL
    const claudeUrl = new URL(CLAUDE_AUTHORIZE_URL);
    claudeUrl.searchParams.set('response_type', 'code');
    claudeUrl.searchParams.set('client_id', CLAUDE_OAUTH_CLIENT_ID);
    claudeUrl.searchParams.set('redirect_uri', CLAUDE_REDIRECT_URI);
    claudeUrl.searchParams.set('scope', 'user:inference user:profile');
    claudeUrl.searchParams.set('code_challenge', codeChallenge);
    claudeUrl.searchParams.set('code_challenge_method', 'S256');
    claudeUrl.searchParams.set('state', state);

    const isDev = process.env.NODE_ENV === 'development';

    // Store the PKCE verifier in an httpOnly cookie so the exchange endpoint can use it
    const response = NextResponse.json({ authorizeUrl: claudeUrl.toString() });
    response.cookies.set('claude_oauth_pkce', codeVerifier, {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Unhandled error in claude auth:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
