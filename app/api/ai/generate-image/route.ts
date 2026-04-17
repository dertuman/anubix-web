import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { GoogleGenAI } from '@google/genai';

import { requireAdmin } from '@/lib/admin-gate';
import { completeWithFallback } from '@/lib/ai/server';
import {
  getImagePromptSystemPrompt,
  getImagePromptUserPrompt,
} from '@/lib/ai/prompts';
import { ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN } from '@/lib/constants';
import { getProviderApiKey } from '@/lib/ai/config';
import type { GenerateImageRequest, GenerateImageResponse } from '@/lib/ai/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

const IMAGE_MODEL_ID = 'gemini-3-pro-image-preview';

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as GenerateImageRequest;
  if (!body.title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

  const googleKey = getProviderApiKey('google');
  if (!googleKey) {
    return NextResponse.json({ error: 'Google AI key not configured' }, { status: 503 });
  }
  if (!ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 });
  }

  try {
    // Step 1 — build the image prompt.
    let prompt = body.customPrompt?.trim();
    if (!prompt) {
      const promptRes = await completeWithFallback({
        task: 'image-prompt',
        system: getImagePromptSystemPrompt(),
        user: getImagePromptUserPrompt(body),
      });
      prompt = promptRes.text.trim();
    }

    // Step 2 — call Nano Banana Pro (Gemini 3 Pro Image Preview).
    const client = new GoogleGenAI({ apiKey: googleKey });
    const imageRes = await client.models.generateContent({
      model: IMAGE_MODEL_ID,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const parts = imageRes.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);
    if (!imgPart?.inlineData?.data) {
      const textFeedback = parts.find((p) => p.text)?.text;
      return NextResponse.json(
        { error: 'Image model returned no image', feedback: textFeedback },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(imgPart.inlineData.data, 'base64');
    const mimeType = imgPart.inlineData.mimeType ?? 'image/png';
    const ext = mimeType.split('/')[1] ?? 'png';
    const filename = `blog/${Date.now()}-${slugify(body.title).slice(0, 60)}.${ext}`;

    const uploaded = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
      token: ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN,
    });

    const response: GenerateImageResponse = {
      url: uploaded.url,
      alt: `Featured image: ${body.title}`,
      prompt,
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed';
    console.error('[generate-image]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
