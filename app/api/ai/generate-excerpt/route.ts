import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';
import { completeWithFallback } from '@/lib/ai/server';
import { getExcerptSystemPrompt, getExcerptUserPrompt } from '@/lib/ai/prompts';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { title, content } = (await req.json()) as { title?: string; content?: string };
  if (!title || !content) {
    return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
  }

  try {
    const res = await completeWithFallback({
      task: 'excerpt',
      system: getExcerptSystemPrompt(),
      user: getExcerptUserPrompt(title, content),
    });

    // Strip stray quotes / labels the model might add.
    let excerpt = res.text.trim();
    excerpt = excerpt.replace(/^(excerpt:?\s*)/i, '').trim();
    excerpt = excerpt.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();

    return NextResponse.json({ excerpt, model: res.model, usage: res.usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Excerpt generation failed';
    console.error('[generate-excerpt]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
