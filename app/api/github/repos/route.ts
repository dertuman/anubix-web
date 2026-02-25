import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * GET /api/github/repos
 * Returns the user's GitHub repos using their stored token.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Get user's email from JWT
  const email = (await supabase.auth.getUser()).data.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'No email found in session' }, { status: 401 });
  }

  const { data: ghConn } = await supabase
    .from('github_connections')
    .select()
    .eq('user_email', email)
    .single();

  if (!ghConn) {
    return NextResponse.json({ connected: false, repos: [] });
  }

  const token = decrypt(ghConn.access_token_encrypted);

  const res = await fetch(
    'https://api.github.com/user/repos?sort=updated&per_page=100&type=owner',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (res.status === 401) {
    // Token revoked — clean up connection
    await supabase.from('github_connections').delete().eq('user_email', email);
    return NextResponse.json({ connected: false, repos: [] });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return NextResponse.json(
      { error: `GitHub API error: ${res.status} ${body}` },
      { status: 502 },
    );
  }

  const data = await res.json();
  const repos = data.map((r: Record<string, unknown>) => ({
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    clone_url: r.clone_url,
    updated_at: r.updated_at,
  }));

  return NextResponse.json({ connected: true, repos });
}
