import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';
import { completeWithFallback } from '@/lib/ai/server';
import { getSeoSystemPrompt, getSeoUserPrompt } from '@/lib/ai/prompts';
import type { GenerateSeoRequest, GenerateSeoResponse } from '@/lib/ai/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as GenerateSeoRequest;
  if (!body.title || !body.excerpt || !body.content) {
    return NextResponse.json({ error: 'Missing title, excerpt, or content' }, { status: 400 });
  }

  try {
    const res = await completeWithFallback({
      task: 'seo',
      system: getSeoSystemPrompt(),
      user: getSeoUserPrompt(body),
      model: body.model,
    });

    let raw = res.text.trim();
    // Strip ```json fences if present
    raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/```\s*$/i, '').trim();

    let parsed: GenerateSeoResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Model returned non-JSON SEO payload', raw }, { status: 502 });
    }

    // Defensive field coercion
    const result: GenerateSeoResponse = {
      metaTitle: String(parsed.metaTitle ?? '').slice(0, 70),
      metaDescription: String(parsed.metaDescription ?? '').slice(0, 180),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((k) => typeof k === 'string').slice(0, 10) : [],
      ogImageAlt: String(parsed.ogImageAlt ?? ''),
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SEO generation failed';
    console.error('[generate-seo]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
