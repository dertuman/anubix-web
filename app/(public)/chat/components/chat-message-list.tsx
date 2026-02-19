'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useScopedI18n } from '@/locales/client';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';

import { ChatMessage } from './chat-message';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  streamingMessage: ChatMessageType | null;
  isStreaming: boolean;
  showThinkingIndicator: boolean;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  streamingMessage,
  isStreaming,
  showThinkingIndicator,
}: ChatMessageListProps) {
  const t = useScopedI18n('chat.messages');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const autoScrollRef = useRef(true);
  const isUserScrollRef = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) {
      if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      else el.scrollTop = el.scrollHeight;
      autoScrollRef.current = true;
      setShowScrollBtn(false);
    }
  }, []);

  useEffect(() => {
    if (autoScrollRef.current)
      requestAnimationFrame(() => scrollToBottom(false));
  }, [messages, streamingMessage, isStreaming, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (isUserScrollRef.current) autoScrollRef.current = isNearBottom;
    setShowScrollBtn(!isNearBottom);
    isUserScrollRef.current = true;
  }, []);

  if (messages.length === 0 && !streamingMessage) {
    return (
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3">
        <Image src="/logo.webp" alt="Anubix logo" width={120} height={120} />
        <p className="text-sm">{t('noMessages')}</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="custom-scrollbar relative flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      <div className="mx-auto space-y-4 px-4 pt-6 pb-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming assistant message */}
        {streamingMessage && (
          <ChatMessage
            key="streaming"
            message={streamingMessage}
            isStreaming
          />
        )}

        {/* Thinking indicator: shown after user sends, before streaming starts */}
        <AnimatePresence>
          {showThinkingIndicator && (
            <motion.div
              key="thinking-indicator"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex justify-start">
                <div className="bg-muted flex items-center gap-3 rounded-xl rounded-bl-none px-4 py-3">
                  <Loader variant="dots" size={18} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="sticky bottom-3 left-1/2 z-10 mx-auto w-fit -translate-x-1/2"
          >
            <Button
              size="sm"
              onClick={() => scrollToBottom(true)}
              className="border-border/50 bg-card hover:bg-accent gap-1 rounded-full border shadow-lg ring-1 ring-border/60"
            >
              <ArrowDown className="size-3" />
              {t('scrollToBottom')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
