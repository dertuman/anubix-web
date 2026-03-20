import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';
import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';

import type { StoredFileAttachment } from '@/types/chat';
import { AI_MODELS_MAP } from '@/types/chat';

import {
  buildAnthropicParts,
  buildGoogleParts,
  buildOpenAIParts,
  generateTitle,
  getAnthropicClient,
  getGoogleClient,
  getOpenAIClient,
} from '@/lib/ai-client';
import { fetchMessages, getConversation, incrementMessageCount, saveMessage } from '@/lib/chat-db';
import { resolveApiKey } from '@/lib/resolve-api-key';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ conversationId: string }> }

/**
 * GET /api/chat/conversations/[conversationId]/messages — Fetch messages.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { conversationId } = await params;

  try {
    const conversation = await getConversation(sb, conversationId);
    if (!conversation || conversation.email !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await fetchMessages(sb, conversationId);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error('[chat/messages GET] Error:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to fetch messages.' }, { status: 500 });
  }
}

/**
 * POST /api/chat/conversations/[conversationId]/messages — Send message + stream response.
 * Body: { content: string, images?: [], files?: StoredFileAttachment[], model?: string }
 *
 * Returns Server-Sent Events: data: {"content":"..."}\n\n
 */
export async function POST(req: NextRequest, { params }: Params) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { conversationId } = await params;

  let resolvedModelKey = ''; // hoisted so catch block can reference it

  try {
    const conversation = await getConversation(sb, conversationId);
    if (!conversation || conversation.email !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { content, images: rawImages, files: rawFiles, model: requestModel } = body;

    // ── Guard: reject payloads that are clearly too large ────────
    // Estimate the total base64 image size before we do expensive work.
    const MAX_IMAGE_PAYLOAD_BYTES = 20 * 1024 * 1024; // 20 MB aggregate
    if (rawFiles?.length) {
      let totalImageBytes = 0;
      for (const f of rawFiles as StoredFileAttachment[]) {
        if (f.category === 'image' && f.data) {
          // data URL ≈ raw base64 length (close enough for a guard)
          totalImageBytes += f.data.length;
        }
      }
      if (totalImageBytes > MAX_IMAGE_PAYLOAD_BYTES) {
        return NextResponse.json(
          { error: 'Too many or too large images. Please remove some images or use smaller files.' },
          { status: 413 },
        );
      }
    }

    // ── Save user message ──────────────────────────────────────
    const storedFiles: StoredFileAttachment[] | null = rawFiles
      ? rawFiles.map((f: StoredFileAttachment) => ({
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          category: f.category,
          ...(f.category === 'image' && f.data ? { data: f.data } : {}),
        }))
      : null;

    await saveMessage(sb, conversationId, 'user', content || '', rawImages || null, storedFiles, null);

    // ── Auto-generate title on first message ───────────────────
    if (conversation.message_count === 0 && content?.trim()) {
      try {
        // Use OpenAI for title gen if available, otherwise use first 40 chars
        let titleApiKey: string | undefined;
        try { titleApiKey = await resolveApiKey(sb, email, 'openai'); } catch { /* ignore */ }

        if (titleApiKey) {
          const title = await generateTitle(content, titleApiKey);
          await sb.from('conversations').update({ title }).eq('id', conversationId);
        } else {
          await sb.from('conversations').update({ title: content.slice(0, 40).trim() }).eq('id', conversationId);
        }
      } catch { /* title gen failure is non-critical */ }
    }

    // ── Build context from recent messages ─────────────────────
    const recentMessages = await fetchMessages(sb, conversationId, 50);
    const modelKey = requestModel || conversation.model;
    resolvedModelKey = modelKey;
    const modelConfig = AI_MODELS_MAP[modelKey];
    const provider = modelConfig?.provider ?? 'openai';

    // ── Only include images from the last 5 messages ────────────
    // Prevents enormous payloads when history has many images.
    const imageInclusionCutoff = Math.max(0, recentMessages.length - 5);

    // ── Resolve API key ────────────────────────────────────────
    let apiKey: string;
    try {
      apiKey = await resolveApiKey(sb, email, provider);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }

    const encoder = new TextEncoder();

    // ── Google streaming ───────────────────────────────────────
    if (provider === 'google') {
      const client = getGoogleClient(apiKey);

      // Build Google format messages
      const systemParts: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const googleContents: { role: string; parts: any[] }[] = [];

      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i];
        if (msg.role === 'system') {
          systemParts.push(msg.content);
          continue;
        }
        const includeMedia = i >= imageInclusionCutoff;
        const parts = buildGoogleParts(
          msg.content,
          includeMedia ? msg.images : null,
          includeMedia ? (msg.files as StoredFileAttachment[] | null) : null,
        );
        googleContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }

      const stream = await client.models.generateContentStream({
        model: modelKey,
        contents: googleContents,
        config: {
          ...(systemParts.length > 0 && { systemInstruction: systemParts.join('\n') }),
          tools: [{ googleSearch: {} }],
        },
      });

      const readable = new ReadableStream({
        async start(controller) {
          let fullContent = '';
          let groundingChunks: { title?: string; uri?: string }[] = [];

          try {
            for await (const chunk of stream) {
              const delta = chunk.text ?? '';
              if (delta) {
                fullContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
              }

              const metadata = chunk.candidates?.[0]?.groundingMetadata;
              if (metadata?.groundingChunks?.length) {
                groundingChunks = metadata.groundingChunks
                  .filter((gc: { web?: { uri?: string } }) => gc.web?.uri)
                  .map((gc: { web?: { title?: string; uri?: string } }) => ({
                    title: gc.web?.title,
                    uri: gc.web?.uri,
                  }));
              }
            }

            // Append sources
            if (groundingChunks.length > 0) {
              const sourcesBlock = '\n\n---\n**Sources:**\n' +
                groundingChunks.map((gc) => `- [${gc.title || gc.uri}](${gc.uri})`).join('\n');
              fullContent += sourcesBlock;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: sourcesBlock })}\n\n`));
            }

            await saveMessage(sb, conversationId, 'assistant', fullContent, null, null, modelKey);
            await incrementMessageCount(sb, conversationId, 2);
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }

    // ── Anthropic streaming ────────────────────────────────────
    if (provider === 'anthropic') {
      const client = getAnthropicClient(apiKey);

      const systemMessages: string[] = [];
      const anthropicMessages: { role: 'user' | 'assistant'; content: Anthropic.Messages.ContentBlockParam[] | string }[] = [];

      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i];
        if (msg.role === 'system') {
          systemMessages.push(msg.content);
          continue;
        }
        const includeMedia = i >= imageInclusionCutoff;
        const hasMedia = includeMedia && ((msg.images && msg.images.length > 0) || (msg.files && (msg.files as StoredFileAttachment[]).length > 0));
        if (hasMedia) {
          anthropicMessages.push({
            role: msg.role as 'user' | 'assistant',
            content: buildAnthropicParts(msg.content, msg.images, msg.files as StoredFileAttachment[] | null),
          });
        } else {
          anthropicMessages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      const stream = await client.messages.stream({
        model: modelKey,
        max_tokens: 8192,
        ...(systemMessages.length > 0 && { system: systemMessages.join('\n') }),
        messages: anthropicMessages,
      });

      const readable = new ReadableStream({
        async start(controller) {
          let fullContent = '';

          try {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const delta = event.delta.text;
                fullContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
              }
            }

            await saveMessage(sb, conversationId, 'assistant', fullContent, null, null, modelKey);
            await incrementMessageCount(sb, conversationId, 2);
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }

    // ── OpenAI streaming (default) ─────────────────────────────
    const client = getOpenAIClient(apiKey);

    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      const includeMedia = i >= imageInclusionCutoff;
      const hasMedia = includeMedia && ((msg.images && msg.images.length > 0) || (msg.files && (msg.files as StoredFileAttachment[]).length > 0));
      if (msg.role === 'user' && hasMedia) {
        openaiMessages.push({
          role: 'user',
          content: buildOpenAIParts(msg.content, msg.images, msg.files as StoredFileAttachment[] | null),
        });
      } else if (msg.role === 'system') {
        openaiMessages.push({ role: 'system', content: msg.content });
      } else if (msg.role === 'assistant') {
        openaiMessages.push({ role: 'assistant', content: msg.content });
      } else {
        openaiMessages.push({ role: 'user', content: msg.content });
      }
    }

    const stream = await client.chat.completions.create({
      model: modelKey,
      messages: openaiMessages,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
            }
          }

          await saveMessage(sb, conversationId, 'assistant', fullContent, null, null, modelKey);
          await incrementMessageCount(sb, conversationId, 2);
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (error) {
    const err = error as Error & { status?: number; code?: string };
    const message = err.message || 'An unexpected error occurred';

    // Differentiate known client errors from server errors
    if (err.status === 401 || err.code === 'invalid_api_key' || message.includes('API key')) {
      return NextResponse.json({ error: 'Invalid API key. Please check your key in settings.' }, { status: 403 });
    }
    if (err.status === 429 || message.includes('rate limit') || message.includes('quota')) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a moment.' }, { status: 429 });
    }
    if (message.includes('encryption') || message.includes('configured')) {
      return NextResponse.json({ error: message }, { status: 503 });
    }

    // Model not found / invalid model
    if (err.status === 404 || message.includes('does not exist') || message.includes('model_not_found') || (message.toLowerCase().includes('model') && (message.includes('not found') || message.includes('invalid')))) {
      return NextResponse.json(
        { error: `Model "${resolvedModelKey || 'unknown'}" is not available. It may not exist or your API key may not have access. Please try a different model.` },
        { status: 400 },
      );
    }

    // Payload / content too large
    if (err.status === 413 || message.includes('too large') || message.includes('payload') || message.includes('maximum context length') || message.includes('token')) {
      return NextResponse.json(
        { error: 'The message is too large (possibly due to images). Please try with fewer or smaller attachments.' },
        { status: 413 },
      );
    }

    // Content policy / moderation
    if (err.status === 400 && (message.includes('safety') || message.includes('policy') || message.includes('moderation'))) {
      return NextResponse.json(
        { error: 'The request was rejected by the content policy. Please try different content.' },
        { status: 400 },
      );
    }

    // Don't leak internal error details to the client
    console.error('[chat/messages] Unhandled error:', message);
    return NextResponse.json({ error: 'Failed to process message. Please try again.' }, { status: 500 });
  }
}
