import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';
import { completeWithFallback } from '@/lib/ai/server';
import { getHumanizeSystemPrompt, getHumanizeUserPrompt } from '@/lib/ai/prompts';
import { cleanHtmlOutput } from '@/lib/ai/humanize';

export const runtime = 'nodejs';
export const maxDuration = 180;

/**
 * Run an extra humanization pass on a supplied HTML body. The admin can
 * trigger this from the editor if they feel the content still sounds
 * AI-generated.
 */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { content } = (await req.json()) as { content?: string };
  if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

  try {
    const res = await completeWithFallback({
      task: 'humanize',
      system: getHumanizeSystemPrompt(),
      user: getHumanizeUserPrompt(content),
    });
    return NextResponse.json({
      content: cleanHtmlOutput(res.text),
      model: res.model,
      usage: res.usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Humanization failed';
    console.error('[humanize]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
