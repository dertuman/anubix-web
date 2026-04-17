import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';
import { isValidSlug, slugify } from '@/lib/slugify';
import { estimateReadingTime } from '@/lib/ai/humanize';
import { BLOG_CATEGORIES } from '@/lib/ai/types';
import type { BlogInsert } from '@/types/supabase';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json();
  const {
    title,
    slug: slugInput,
    excerpt,
    content,
    category,
    tags = [],
    featured_image_url,
    featured_image_alt,
    featured_image_caption,
    meta_title,
    meta_description,
    keywords = [],
    og_image_alt,
    author_role,
    author_bio,
    featured = false,
    is_draft = true,
    generation_metadata,
  } = body ?? {};

  if (!title || !content) {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
  }
  if (!category || !BLOG_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `category must be one of: ${BLOG_CATEGORIES.join(', ')}` }, { status: 400 });
  }

  const slug = slugInput?.trim() ? slugify(slugInput) : slugify(title);
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'slug is invalid (lowercase letters/numbers/hyphens, 3-80 chars)' }, { status: 400 });
  }

  // Unique slug check
  const { data: existing } = await gate.supabase
    .from('blogs')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `slug "${slug}" already exists` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const publishedAt = is_draft ? null : now;

  const insert: BlogInsert = {
    slug,
    title,
    excerpt: excerpt ?? null,
    content,
    category,
    tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
    featured_image_url: featured_image_url ?? null,
    featured_image_alt: featured_image_alt ?? null,
    featured_image_caption: featured_image_caption ?? null,
    meta_title: meta_title ?? null,
    meta_description: meta_description ?? null,
    keywords: Array.isArray(keywords) ? keywords.slice(0, 10) : [],
    og_image_alt: og_image_alt ?? null,
    author_name: gate.profile.name || 'Anubix Team',
    author_email: gate.email,
    author_avatar: gate.profile.profile_picture || null,
    author_role: author_role ?? null,
    author_bio: author_bio ?? null,
    reading_time: estimateReadingTime(content),
    featured: Boolean(featured),
    is_draft: Boolean(is_draft),
    published_at: publishedAt,
    generation_metadata: generation_metadata ?? null,
  };

  const { data, error } = await gate.supabase.from('blogs').insert(insert).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ blog: data });
}
