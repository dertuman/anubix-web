import { createSupabaseAdmin } from '@/lib/supabase/server';
import type { Blog } from '@/types/supabase';

/**
 * Server-side fetch helpers for public blog pages. They call Supabase
 * directly (not /api/*) so server components stay synchronous and fast.
 */

export async function getBlogBySlug(slug: string, opts?: { includeDrafts?: boolean }): Promise<Blog | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;

  let query = supabase.from('blogs').select('*').eq('slug', slug);
  if (!opts?.includeDrafts) {
    query = query.eq('is_draft', false).not('published_at', 'is', null);
  }
  const { data } = await query.maybeSingle();
  return data;
}

export interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  featured_image_url: string | null;
  featured_image_alt: string | null;
  reading_time: number;
  featured: boolean;
  published_at: string | null;
  views: number;
  likes: number;
  author_name: string;
  author_avatar: string | null;
}

export async function listPublishedBlogs(opts?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
  featured?: boolean;
}): Promise<{ blogs: BlogListItem[]; total: number }> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return { blogs: [], total: 0 };

  const { search, category, limit = 12, offset = 0, featured } = opts ?? {};

  let query = supabase
    .from('blogs')
    .select(
      'id, slug, title, excerpt, category, tags, featured_image_url, featured_image_alt, reading_time, featured, published_at, views, likes, author_name, author_avatar',
      { count: 'exact' },
    )
    .eq('is_draft', false)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
  if (category) query = query.eq('category', category);
  if (featured) query = query.eq('featured', true);

  const { data, count } = await query;
  return { blogs: data ?? [], total: count ?? 0 };
}

export async function listAllPublishedSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from('blogs')
    .select('slug, updated_at')
    .eq('is_draft', false)
    .not('published_at', 'is', null);
  return data ?? [];
}
