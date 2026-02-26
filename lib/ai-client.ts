import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

import { AI_MODELS_MAP, type StoredFileAttachment } from '@/types/chat';

// =============================================================================
// Client factories
// =============================================================================

export function getOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export function getGoogleClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export function getAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export function getModelProvider(modelId: string) {
  return AI_MODELS_MAP[modelId]?.provider ?? 'openai';
}

// =============================================================================
// Content-part builders
// =============================================================================

/**
 * Build OpenAI-compatible content parts (multi-modal).
 */
export function buildOpenAIParts(
  content: string,
  images: Array<{ uri: string; base64: string }> | null,
  files: StoredFileAttachment[] | null,
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  if (content) parts.push({ type: 'text', text: content });

  // Legacy images from native app
  if (images) {
    for (const img of images) {
      const url = img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64}`;
      parts.push({ type: 'image_url', image_url: { url } });
    }
  }

  // Rich file attachments from web app
  if (files) {
    for (const file of files) {
      if (file.category === 'image' && file.data) {
        parts.push({ type: 'image_url', image_url: { url: file.data } });
      }
      // Audio with input_audio format for OpenAI
      if (file.category === 'audio' && file.data) {
        const parsed = parseDataUrl(file.data);
        if (parsed) {
          parts.push({
            type: 'input_audio' as 'text',
            input_audio: { data: parsed.data, format: detectAudioFormat(parsed.mimeType) },
          } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart);
        }
      }
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text', text: content || '' }];
}

/**
 * Build Google Gemini content parts.
 */
export function buildGoogleParts(
  content: string,
  images: Array<{ uri: string; base64: string }> | null,
  files: StoredFileAttachment[] | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];

  if (content) parts.push({ text: content });

  // Legacy images
  if (images) {
    for (const img of images) {
      const parsed = parseDataUrl(img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64}`);
      if (parsed) parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
  }

  // Rich file attachments
  if (files) {
    for (const file of files) {
      if (!file.data) continue;
      const parsed = parseDataUrl(file.data);
      if (parsed) parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
  }

  return parts.length > 0 ? parts : [{ text: content || '' }];
}

/**
 * Build Anthropic content blocks.
 */
export function buildAnthropicParts(
  content: string,
  images: Array<{ uri: string; base64: string }> | null,
  files: StoredFileAttachment[] | null,
): Anthropic.Messages.ContentBlockParam[] {
  const parts: Anthropic.Messages.ContentBlockParam[] = [];

  // Images first
  if (images) {
    for (const img of images) {
      const parsed = parseDataUrl(img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64}`);
      if (parsed) {
        parts.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: parsed.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: parsed.data,
          },
        });
      }
    }
  }

  if (files) {
    for (const file of files) {
      if (file.category === 'image' && file.data) {
        const parsed = parseDataUrl(file.data);
        if (parsed) {
          parts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: parsed.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: parsed.data,
            },
          });
        }
      }
    }
  }

  if (content) parts.push({ type: 'text', text: content });

  return parts.length > 0 ? parts : [{ type: 'text', text: content || '' }];
}

// =============================================================================
// Title generation
// =============================================================================

/**
 * Generate a short title for a conversation based on the first message.
 */
export async function generateTitle(content: string, openaiApiKey: string): Promise<string> {
  try {
    const client = new OpenAI({ apiKey: openaiApiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a short title (3-6 words) for a conversation that starts with the following message. Reply with only the title, no quotes, no punctuation at the end.',
        },
        { role: 'user', content: content.slice(0, 500) },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    const title = response.choices[0]?.message?.content?.trim();
    return title || content.slice(0, 40).trim();
  } catch (err) {
    console.error('Failed to generate title:', err);
    return content.slice(0, 40).trim() || 'New Conversation';
  }
}

// =============================================================================
// Helpers
// =============================================================================

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function detectAudioFormat(mimeType: string): string {
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'mp3';
}
