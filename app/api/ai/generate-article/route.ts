import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';
import { completeWithFallback } from '@/lib/ai/server';
import {
  getArticleSystemPrompt,
  getArticleUserPrompt,
  getHumanizeSystemPrompt,
  getHumanizeUserPrompt,
} from '@/lib/ai/prompts';
import { cleanHtmlOutput, countForbiddenPhrases, estimateReadingTime } from '@/lib/ai/humanize';
import type {
  GenerateArticleRequest,
  GenerateArticleResponse,
} from '@/lib/ai/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as GenerateArticleRequest;
  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  }

  try {
    // Pass 1 — draft with Gemini 3 Pro (creative, fast, different fingerprint than final).
    const draft = await completeWithFallback({
      task: 'article',
      system: getArticleSystemPrompt(),
      user: getArticleUserPrompt(body),
      model: body.model,
    });

    let html = cleanHtmlOutput(draft.text);

    // Pass 2 — humanize with Claude (different model, different fingerprint,
    // explicitly targets AI-content detector signals).
    const humanized = await completeWithFallback({
      task: 'humanize',
      system: getHumanizeSystemPrompt(),
      user: getHumanizeUserPrompt(html),
    });
    html = cleanHtmlOutput(humanized.text);
    let humanizePasses = 1;

    // Pass 3 (conditional) — if the draft still contains forbidden phrases,
    // run one more humanization pass on the problematic version.
    if (countForbiddenPhrases(html) > 0) {
      const rePolish = await completeWithFallback({
        task: 'humanize',
        system: getHumanizeSystemPrompt(),
        user: getHumanizeUserPrompt(html),
      });
      html = cleanHtmlOutput(rePolish.text);
      humanizePasses = 2;
    }

    const readingTime = estimateReadingTime(html);

    const response: GenerateArticleResponse = {
      content: html,
      readingTime,
      model: draft.model,
      usage: draft.usage,
      humanizePasses,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Article generation failed';
    console.error('[generate-article]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
