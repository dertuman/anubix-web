import { NextResponse } from 'next/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/blog/search?search=...&category=...&featured=1&page=1&limit=12
 *
 * Public search / listing. Only published blogs are returned.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim();
  const category = url.searchParams.get('category')?.trim();
  const featured = url.searchParams.get('featured') === '1';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '12')));
  const offset = (page - 1) * limit;

  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  let query = supabase
    .from('blogs')
    .select('id, slug, title, excerpt, category, tags, featured_image_url, featured_image_alt, reading_time, featured, published_at, views, likes, author_name, author_avatar, created_at', { count: 'exact' })
    .eq('is_draft', false)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
  }
  if (category) query = query.eq('category', category);
  if (featured) query = query.eq('featured', true);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    blogs: data ?? [],
    total: count ?? 0,
    page,
    limit,
    hasMore: (count ?? 0) > offset + (data?.length ?? 0),
  });
}
