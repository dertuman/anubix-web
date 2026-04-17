import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';

export const runtime = 'nodejs';

/**
 * GET /api/admin/blog/list
 * Returns all blogs (including drafts) for the admin library.
 */
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const category = url.searchParams.get('category')?.trim();
  const status = url.searchParams.get('status');

  let query = gate.supabase
    .from('blogs')
    .select('id, slug, title, excerpt, category, tags, featured_image_url, featured, is_draft, published_at, views, likes, author_name, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (search) query = query.ilike('title', `%${search}%`);
  if (category) query = query.eq('category', category);
  if (status === 'draft') query = query.eq('is_draft', true);
  if (status === 'published') query = query.eq('is_draft', false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ blogs: data ?? [] });
}
