import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';
import { isValidSlug, slugify } from '@/lib/slugify';
import { estimateReadingTime } from '@/lib/ai/humanize';
import { BLOG_CATEGORIES } from '@/lib/ai/types';
import type { BlogUpdate } from '@/types/supabase';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json();
  const { id, newSlug, ...fields } = body ?? {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const update: BlogUpdate = {};

  if (typeof fields.title === 'string') update.title = fields.title;
  if (typeof fields.excerpt === 'string' || fields.excerpt === null) update.excerpt = fields.excerpt;
  if (typeof fields.content === 'string') {
    update.content = fields.content;
    update.reading_time = estimateReadingTime(fields.content);
  }
  if (typeof fields.category === 'string') {
    if (!BLOG_CATEGORIES.includes(fields.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    update.category = fields.category;
  }
  if (Array.isArray(fields.tags)) update.tags = fields.tags.slice(0, 20);
  if ('featured_image_url' in fields) update.featured_image_url = fields.featured_image_url;
  if ('featured_image_alt' in fields) update.featured_image_alt = fields.featured_image_alt;
  if ('featured_image_caption' in fields) update.featured_image_caption = fields.featured_image_caption;
  if ('meta_title' in fields) update.meta_title = fields.meta_title;
  if ('meta_description' in fields) update.meta_description = fields.meta_description;
  if (Array.isArray(fields.keywords)) update.keywords = fields.keywords.slice(0, 10);
  if ('og_image_alt' in fields) update.og_image_alt = fields.og_image_alt;
  if ('author_role' in fields) update.author_role = fields.author_role;
  if ('author_bio' in fields) update.author_bio = fields.author_bio;
  if (typeof fields.featured === 'boolean') update.featured = fields.featured;

  // Draft <-> published transitions
  if (typeof fields.is_draft === 'boolean') {
    update.is_draft = fields.is_draft;
    if (!fields.is_draft) {
      // Becoming published — set published_at if the record wasn't already published.
      const { data: current } = await gate.supabase
        .from('blogs')
        .select('published_at')
        .eq('id', id)
        .single();
      if (!current?.published_at) update.published_at = new Date().toISOString();
    }
  }

  // Slug rename with conflict check
  if (newSlug) {
    const candidate = slugify(newSlug);
    if (!isValidSlug(candidate)) {
      return NextResponse.json({ error: 'newSlug is invalid' }, { status: 400 });
    }
    const { data: clash } = await gate.supabase
      .from('blogs')
      .select('id')
      .eq('slug', candidate)
      .neq('id', id)
      .maybeSingle();
    if (clash) return NextResponse.json({ error: `slug "${candidate}" already exists` }, { status: 409 });
    update.slug = candidate;
  }

  const { data, error } = await gate.supabase.from('blogs').update(update).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ blog: data });
}
