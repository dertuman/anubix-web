import { NextResponse } from 'next/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getAuthEmail } from '@/lib/auth-utils';

export const runtime = 'nodejs';

/**
 * GET /api/blog/get?slug=...
 *
 * Returns a single published blog post by slug. Admins can also fetch
 * drafts by passing ?includeDrafts=1.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  const includeDrafts = url.searchParams.get('includeDrafts') === '1';
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  let query = supabase.from('blogs').select('*').eq('slug', slug);
  if (!includeDrafts) query = query.eq('is_draft', false).not('published_at', 'is', null);

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Admin-only draft access
  if (data.is_draft) {
    const email = await getAuthEmail();
    if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('email', email).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ blog: data });
}
