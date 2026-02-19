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
      // Build stored files for API
      const storedFiles: StoredFileAttachment[] | undefined = files?.map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        category: f.category,
        ...(f.category === 'image' && f.data ? { data: f.data } : {}),
      }));

      // Build images for native compat
      const imageDataUrls = files
        ?.filter((f) => f.category === 'image' && f.data)
        .map((f) => ({ uri: f.name, base64: f.data! }));

      // Optimistic user message
      const userMsg: ChatMessageType = {
        id: `optimistic-user-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content: text,
        images: imageDataUrls?.length ? imageDataUrls : null,
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
              images: imageDataUrls?.length ? imageDataUrls : undefined,
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
        setIsStreaming(false);
        setWaitingForResponse(false);
        setStreamingContent('');
        streamedRef.current = '';
        setOptimisticMessages([]);
        abortControllerRef.current = null;

        // Refresh messages and conversations from server
        queryClient.invalidateQueries({ queryKey: ['chat-messages', convId] });
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
