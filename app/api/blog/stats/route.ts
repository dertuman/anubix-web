import { NextResponse } from 'next/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getAuthEmail } from '@/lib/auth-utils';

export const runtime = 'nodejs';

/**
 * POST /api/blog/stats
 * Body: { type: 'view' | 'share' | 'like', slug: string }
 *
 * Public endpoint. view/share increment counters. like toggles per-user.
 */
export async function POST(req: Request) {
  const { type, slug } = (await req.json()) as { type?: string; slug?: string };
  if (!slug || !type) return NextResponse.json({ error: 'Missing type or slug' }, { status: 400 });

  const supabase = createSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { data: blog } = await supabase
    .from('blogs')
    .select('id, views, shares, likes')
    .eq('slug', slug)
    .eq('is_draft', false)
    .single();
  if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

  if (type === 'view') {
    await supabase.from('blogs').update({ views: blog.views + 1 }).eq('id', blog.id);
    return NextResponse.json({ success: true, views: blog.views + 1 });
  }

  if (type === 'share') {
    await supabase.from('blogs').update({ shares: blog.shares + 1 }).eq('id', blog.id);
    return NextResponse.json({ success: true, shares: blog.shares + 1 });
  }

  if (type === 'like') {
    const email = await getAuthEmail();
    if (!email) return NextResponse.json({ error: 'Sign in to like posts' }, { status: 401 });

    const { data: existing } = await supabase
      .from('blog_likes')
      .select('id')
      .eq('blog_id', blog.id)
      .eq('user_email', email)
      .maybeSingle();

    if (existing) {
      await supabase.from('blog_likes').delete().eq('id', existing.id);
      const newLikes = Math.max(0, blog.likes - 1);
      await supabase.from('blogs').update({ likes: newLikes }).eq('id', blog.id);
      return NextResponse.json({ success: true, liked: false, likes: newLikes });
    }

    await supabase.from('blog_likes').insert({ blog_id: blog.id, user_email: email });
    const newLikes = blog.likes + 1;
    await supabase.from('blogs').update({ likes: newLikes }).eq('id', blog.id);
    return NextResponse.json({ success: true, liked: true, likes: newLikes });
  }

  return NextResponse.json({ error: 'Unknown stat type' }, { status: 400 });
}
