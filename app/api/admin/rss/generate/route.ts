import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { GoogleGenAI } from '@google/genai';

import { requireAdmin } from '@/lib/admin-gate';
import { completeWithFallback } from '@/lib/ai/server';
import { getProviderApiKey } from '@/lib/ai/config';
import {
  getRssRewriteSystemPrompt,
  getRssRewriteUserPrompt,
  getRssTitleSystemPrompt,
  getRssTitleUserPrompt,
  getHumanizeSystemPrompt,
  getHumanizeUserPrompt,
  getExcerptSystemPrompt,
  getExcerptUserPrompt,
  getSeoSystemPrompt,
  getSeoUserPrompt,
  getImagePromptSystemPrompt,
  getImagePromptUserPrompt,
} from '@/lib/ai/prompts';
import { cleanHtmlOutput, countForbiddenPhrases, estimateReadingTime } from '@/lib/ai/humanize';
import { isValidSlug, slugify } from '@/lib/slugify';
import { ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN } from '@/lib/constants';
import type { GenerateSeoResponse } from '@/lib/ai/types';
import type { BlogInsert } from '@/types/supabase';

export const runtime = 'nodejs';
export const maxDuration = 300;

const IMAGE_MODEL_ID = 'gemini-3-pro-image-preview';

interface RssGenerateBody {
  sourceUrl: string;
  sourceTitle: string;
  sourceSnippet?: string;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as RssGenerateBody;
  if (!body.sourceUrl || !body.sourceTitle) {
    return NextResponse.json({ error: 'sourceUrl and sourceTitle are required' }, { status: 400 });
  }

  const { data: dup } = await gate.supabase
    .from('blogs')
    .select('id, slug')
    .eq('source_url', body.sourceUrl)
    .maybeSingle();
  if (dup) {
    return NextResponse.json({ error: 'This source has already been used', blogId: dup.id }, { status: 409 });
  }

  try {
    // 1. Rewrite the headline in our voice.
    const titleRes = await completeWithFallback({
      task: 'excerpt',
      system: getRssTitleSystemPrompt(),
      user: getRssTitleUserPrompt(body.sourceTitle),
    });
    const title = titleRes.text.trim().replace(/^["']|["']$/g, '').slice(0, 120);

    // 2. Draft with sonar-pro (search-grounded — fresh facts on the story).
    const draft = await completeWithFallback({
      task: 'article',
      model: 'sonar-pro',
      system: getRssRewriteSystemPrompt(),
      user: getRssRewriteUserPrompt({
        sourceTitle: body.sourceTitle,
        sourceSnippet: body.sourceSnippet ?? '',
        sourceLink: body.sourceUrl,
      }),
    });
    let html = cleanHtmlOutput(draft.text);

    // 3. Humanize with GPT-4o (cross-model pass breaks single-model fingerprint).
    const humanized = await completeWithFallback({
      task: 'humanize',
      system: getHumanizeSystemPrompt(),
      user: getHumanizeUserPrompt(html),
    });
    html = cleanHtmlOutput(humanized.text);
    let humanizePasses = 1;
    if (countForbiddenPhrases(html) > 0) {
      const rePolish = await completeWithFallback({
        task: 'humanize',
        system: getHumanizeSystemPrompt(),
        user: getHumanizeUserPrompt(html),
      });
      html = cleanHtmlOutput(rePolish.text);
      humanizePasses = 2;
    }

    // 4. Excerpt.
    const excerptRes = await completeWithFallback({
      task: 'excerpt',
      system: getExcerptSystemPrompt(),
      user: getExcerptUserPrompt(title, html),
    });
    const excerpt = excerptRes.text.trim().slice(0, 260);

    // 5. SEO (json mode on by default for this task).
    const seoRes = await completeWithFallback({
      task: 'seo',
      system: getSeoSystemPrompt(),
      user: getSeoUserPrompt({ title, excerpt, content: html }),
    });
    let seo: GenerateSeoResponse = { metaTitle: title, metaDescription: excerpt, keywords: [], ogImageAlt: '' };
    try {
      const parsed = JSON.parse(seoRes.text) as Partial<GenerateSeoResponse>;
      seo = {
        metaTitle: String(parsed.metaTitle ?? title).slice(0, 70),
        metaDescription: String(parsed.metaDescription ?? excerpt).slice(0, 180),
        keywords: Array.isArray(parsed.keywords)
          ? parsed.keywords.filter((k): k is string => typeof k === 'string').slice(0, 10)
          : [],
        ogImageAlt: String(parsed.ogImageAlt ?? ''),
      };
    } catch {
      console.warn('[rss-generate] SEO JSON parse failed, falling back to title/excerpt');
    }

    // 6. Hero image (non-fatal — if it fails, post still publishes).
    let featuredImageUrl: string | null = null;
    let featuredImageAlt: string | null = null;
    const googleKey = getProviderApiKey('google');
    if (googleKey && ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN) {
      try {
        const promptRes = await completeWithFallback({
          task: 'image-prompt',
          system: getImagePromptSystemPrompt(),
          user: getImagePromptUserPrompt({ title, category: 'AI Development' }),
        });
        const imgPrompt = promptRes.text.trim();
        const client = new GoogleGenAI({ apiKey: googleKey });
        const imageRes = await client.models.generateContent({
          model: IMAGE_MODEL_ID,
          contents: [{ role: 'user', parts: [{ text: imgPrompt }] }],
        });
        const parts = imageRes.candidates?.[0]?.content?.parts ?? [];
        const imgPart = parts.find((p) => p.inlineData?.data);
        if (imgPart?.inlineData?.data) {
          const buffer = Buffer.from(imgPart.inlineData.data, 'base64');
          const blob = await put(`blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`, buffer, {
            access: 'public',
            token: ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN,
            contentType: imgPart.inlineData.mimeType ?? 'image/png',
          });
          featuredImageUrl = blob.url;
          featuredImageAlt = seo.ogImageAlt || title;
        }
      } catch (err) {
        console.warn('[rss-generate] image generation failed:', (err as Error).message);
      }
    }

    // 7. Slug with collision handling.
    let slug = slugify(title);
    if (!isValidSlug(slug)) slug = slugify(`article-${Date.now()}`);
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await gate.supabase.from('blogs').select('id').eq('slug', slug).maybeSingle();
      if (!clash) break;
      slug = slugify(`${title}-${Math.random().toString(36).slice(2, 6)}`);
    }

    // 8. Insert as draft.
    const insert: BlogInsert = {
      slug,
      title,
      excerpt,
      content: html,
      category: 'AI Development',
      tags: seo.keywords.slice(0, 8),
      featured_image_url: featuredImageUrl,
      featured_image_alt: featuredImageAlt,
      meta_title: seo.metaTitle,
      meta_description: seo.metaDescription,
      keywords: seo.keywords,
      og_image_alt: seo.ogImageAlt,
      author_name: gate.profile.name || 'Anubix Team',
      author_email: gate.email,
      author_avatar: gate.profile.profile_picture || null,
      reading_time: estimateReadingTime(html),
      is_draft: true,
      source_url: body.sourceUrl,
      generation_metadata: {
        mode: 'rss',
        humanizePasses,
        models: { article: draft.model, humanize: humanized.model },
      },
    };

    const { data: created, error } = await gate.supabase.from('blogs').insert(insert).select('id, slug').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ blogId: created.id, slug: created.slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RSS generation failed';
    console.error('[rss-generate]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
