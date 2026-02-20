'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useScopedI18n } from '@/locales/client';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';

import { ChatMessage } from './chat-message';

// Breathing room between the top of the user's message and the top of the
// visible scroll area (px). Keeps it consistent regardless of message length.
const BREATHING_PX = 24;

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  streamingContent: string;
  showThinkingIndicator: boolean;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  isStreaming,
  streamingContent,
  showThinkingIndicator,
}: ChatMessageListProps) {
  const t = useScopedI18n('chat.messages');
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const autoScrollRef = useRef(true);

  // Dynamic spacer height — calculated to push the user's message to the
  // top of the viewport with consistent breathing room.
  const [spacerHeight, setSpacerHeight] = useState(0);

  const isActive = isStreaming || showThinkingIndicator;

  // ── Scroll helpers ─────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    else el.scrollTop = el.scrollHeight;
    autoScrollRef.current = true;
    setShowScrollBtn(false);
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    autoScrollRef.current = isNearBottom;
    setShowScrollBtn(!isNearBottom);
  }, []);

  // ── Calculate spacer height ────────────────────────────────
  // When streaming/thinking starts, measure the last user message and
  // compute exactly how much bottom padding we need so the user's
  // message sits at the top of the viewport with BREATHING_PX gap.
  // When streaming ends, spacer collapses to 0.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isActive) {
      setSpacerHeight(0);
      return;
    }

    const container = scrollRef.current;
    const userMsg = lastUserMsgRef.current;
    if (!container || !userMsg) {
      // Fallback: generous padding if we can't measure
      setSpacerHeight(container?.clientHeight ?? 0);
      return;
    }

    // The visible height of the scroll container
    const viewportH = container.clientHeight;
    // We want: when scrolled so user msg top is at BREATHING_PX from container top,
    // the total scrollHeight should equal scrollTop + viewportH.
    // scrollTop would be: msgOffsetTop - BREATHING_PX
    // Total content below msgOffsetTop - BREATHING_PX should fill viewportH.
    // So spacer = viewportH - (naturalContentBelowUserMsg)
    // Simplest: spacer = viewportH - BREATHING_PX (to always fill the view below the msg)
    const spacer = viewportH - BREATHING_PX;
    setSpacerHeight(Math.max(0, spacer));
  }, [isActive, messages.length]);

  // ── Callback ref for auto-scroll ───────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const bottomAnchorRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && autoScrollRef.current) {
        el.scrollIntoView({ block: 'end', behavior: 'auto' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, isStreaming, streamingContent, showThinkingIndicator, spacerHeight],
  );

  // ── Find the index of the last user message for the ref ────
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }

  // ── Empty state ────────────────────────────────────────────
  if (messages.length === 0 && !isStreaming && !showThinkingIndicator) {
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
      <div ref={innerRef} className="mx-auto space-y-2 px-4 pt-6 pb-6">
        {/* ── Persisted + optimistic messages ──────────────── */}
        {messages.map((msg, i) => (
          <div key={msg.id} ref={i === lastUserIdx ? lastUserMsgRef : undefined}>
            <ChatMessage message={msg} />
          </div>
        ))}

        {/* ── Streaming response (rendered inline, like Telkartech) ── */}
        {isStreaming && (
          <div className="flex justify-start">
            <div
              className={cn(
                'overflow-hidden rounded-xl rounded-bl-none bg-muted px-4 py-2.5',
                !streamingContent && 'py-3.5',
              )}
            >
              {streamingContent ? (
                <div className="min-w-0 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">
                  {streamingContent}
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground/60" />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-foreground/40" />
                  <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-foreground/40" />
                  <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-foreground/40" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Thinking indicator (between send and stream start) ── */}
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

        {/* ── Dynamic spacer: pushes user msg to top with breathing room ── */}
        {spacerHeight > 0 && <div style={{ height: spacerHeight }} />}

        {/* ── Scroll anchor (callback ref fires before paint) ── */}
        <div ref={bottomAnchorRef} />
      </div>

      {/* ── Scroll-to-bottom button ───────────────────────── */}
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
