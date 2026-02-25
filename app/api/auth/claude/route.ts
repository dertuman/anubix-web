import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

const CLAUDE_OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const CLAUDE_AUTHORIZE_URL = 'https://claude.ai/oauth/authorize';
const CLAUDE_REDIRECT_URI = 'https://console.anthropic.com/oauth/code/callback';
const CLAUDE_SCOPE = 'org:create_api_key user:profile user:inference';

/**
 * POST /api/auth/claude
 * Generates a PKCE challenge and returns the Claude OAuth authorize URL.
 * Stores both PKCE verifier and state in httpOnly cookies.
 */
export async function POST() {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    // Generate PKCE code verifier and challenge (RFC 7636)
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    // Separate random state for CSRF protection
    const state = randomBytes(32).toString('base64url');

    // Build the authorization URL (matching Claude Code CLI format)
    const claudeUrl = new URL(CLAUDE_AUTHORIZE_URL);
    claudeUrl.searchParams.set('code', 'true');
    claudeUrl.searchParams.set('client_id', CLAUDE_OAUTH_CLIENT_ID);
    claudeUrl.searchParams.set('response_type', 'code');
    claudeUrl.searchParams.set('redirect_uri', CLAUDE_REDIRECT_URI);
    claudeUrl.searchParams.set('scope', CLAUDE_SCOPE);
    claudeUrl.searchParams.set('code_challenge', codeChallenge);
    claudeUrl.searchParams.set('code_challenge_method', 'S256');
    claudeUrl.searchParams.set('state', state);

    const isDev = process.env.NODE_ENV === 'development';
    const cookieOpts = {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'lax' as const,
      maxAge: 600,
      path: '/',
    };

    const response = NextResponse.json({ authorizeUrl: claudeUrl.toString() });
    response.cookies.set('claude_oauth_pkce', codeVerifier, cookieOpts);
    response.cookies.set('claude_oauth_state', state, cookieOpts);

    return response;
  } catch (err) {
    console.error('Unhandled error in claude auth:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
