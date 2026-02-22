import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ChatMessage as ChatMessageType, ModelId } from '@/types/chat';
import type { FileAttachment } from '@/types/code';
import type { StoredFileAttachment } from '@/types/chat';
import { toast } from '@/components/ui/use-toast';

/**
 * Encapsulates all streaming SSE logic:
 * - Optimistic messages
 * - Fetch + stream parsing
 * - Abort handling
 * - Query invalidation on completion
 */
export function useChatStreaming() {
  const queryClient = useQueryClient();

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessageType[]>([]);
  const [waitingForResponse, setWaitingForResponse] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamedRef = useRef('');

  const sendMessage = useCallback(
    async (convId: string, text: string, model: ModelId, files?: FileAttachment[]) => {
      // Build stored files for API (web app format only — no legacy `images` duplication)
      const storedFiles: StoredFileAttachment[] | undefined = files?.map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        category: f.category,
        ...(f.category === 'image' && f.data ? { data: f.data } : {}),
      }));

      // Optimistic user message
      const userMsg: ChatMessageType = {
        id: `optimistic-user-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content: text,
        images: null,
        files: storedFiles?.length ? storedFiles : null,
        model: null,
        created_at: new Date().toISOString(),
      };
      setOptimisticMessages((prev) => [...prev, userMsg]);
      setWaitingForResponse(true);

      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch(
          `/api/chat/conversations/${convId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: text,
              files: storedFiles?.length ? storedFiles : undefined,
              model,
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to send message');
        }

        setIsStreaming(true);
        setWaitingForResponse(false);
        streamedRef.current = '';
        setStreamingContent('');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) break;
                if (data.error) {
                  toast({ title: 'Error', description: data.error, variant: 'destructive' });
                  break;
                }
                if (data.content) {
                  streamedRef.current += data.content;
                  setStreamingContent(streamedRef.current);
                }
              } catch { /* skip malformed chunks */ }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast({ title: 'Error', description: (err as Error).message || 'Failed to send message.', variant: 'destructive' });
        }
      } finally {
        // ── Bridge pattern (from Telkartech) ────────────────────
        // Keep streamed content visible as an optimistic assistant message
        // so the user never sees messages disappear while we refetch.
        if (streamedRef.current) {
          setOptimisticMessages((prev) => [
            ...prev,
            {
              id: `optimistic-assistant-${Date.now()}`,
              conversation_id: convId,
              role: 'assistant',
              content: streamedRef.current,
              images: null,
              files: null,
              model,
              created_at: new Date().toISOString(),
            },
          ]);
        }

        // Clear streaming state (optimistic message holds the content now)
        setIsStreaming(false);
        setWaitingForResponse(false);
        setStreamingContent('');
        streamedRef.current = '';
        abortControllerRef.current = null;

        // Wait for server messages to arrive, then clear optimistic in the
        // same tick so React batches both into ONE render — no duplicate frame.
        // (This is exactly how Telkartech does it.)
        await queryClient.invalidateQueries({ queryKey: ['chat-messages', convId] });
        setOptimisticMessages([]);

        // Conversations list refresh is non-critical — fire and forget
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      }
    },
    [queryClient],
  );

  const abortStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    isStreaming,
    streamingContent,
    optimisticMessages,
    waitingForResponse,
    sendMessage,
    abortStream,
  };
}
