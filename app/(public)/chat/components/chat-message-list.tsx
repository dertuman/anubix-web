'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useScopedI18n } from '@/locales/client';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';

import { ChatMessage, renderMarkdown } from './chat-message';

// Breathing room between the top of the user's message and the top of the
// visible scroll area (px). Keeps it consistent regardless of message length.
const BREATHING_PX = 10;

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

  // Track isActive transitions for one-time scroll on send
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const prevIsActiveRef = useRef(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const justSentRef = useRef(false);

  // Track previous isActive state for scroll-to-bottom on stream end
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const wasActiveRef = useRef(false);

  // Saved scroll position before spacer collapses — used to restore view
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const savedScrollTopRef = useRef(0);

  // Previous spacer height — detects the collapse transition in useLayoutEffect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const prevSpacerRef = useRef(0);

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
  // When streaming/thinking starts, compute spacer so the user's
  // message sits at the top of the viewport with BREATHING_PX gap.
  // When streaming ends, save scroll position then collapse spacer to 0 so
  // the useLayoutEffect below can restore it before the next paint.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isActive) {
      // Save current scroll position BEFORE collapsing spacer
      savedScrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
      setSpacerHeight(0);
      prevIsActiveRef.current = false;
      return;
    }

    const container = scrollRef.current;
    const userMsg = lastUserMsgRef.current;
    if (!container || !userMsg) {
      // Fallback: generous padding if we can't measure
      setSpacerHeight(container?.clientHeight ?? 0);
      prevIsActiveRef.current = true;
      return;
    }

    // The visible height of the scroll container
    const viewportH = container.clientHeight;
    const spacer = viewportH - BREATHING_PX;
    setSpacerHeight(Math.max(0, spacer));

    // On the transition to active (message just sent), flag for one-time scroll
    if (!prevIsActiveRef.current) {
      justSentRef.current = true;
      prevIsActiveRef.current = true;
    }
  }, [isActive, messages.length]);

  // ── One-time scroll: position user message at top after spacer renders ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!justSentRef.current || spacerHeight === 0) return;
    justSentRef.current = false;

    const container = scrollRef.current;
    const userMsg = lastUserMsgRef.current;
    if (!container || !userMsg) return;

    // Scroll so user message top is at BREATHING_PX from container top
    container.scrollTop = userMsg.offsetTop - BREATHING_PX;

    // Disable auto-scroll so streaming content doesn't pull the view down
    autoScrollRef.current = false;
  }, [spacerHeight]);

  // ── Track wasActive for other logic ────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    wasActiveRef.current = isActive;
  }, [isActive]);

  // ── Restore scroll position when spacer collapses ──────────
  // Runs synchronously after DOM commit, before paint, preventing any
  // visible jump caused by the spacer shrinking the scrollable area.
  // If the user was near the bottom they stay at the bottom; otherwise
  // their reading position is preserved exactly.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(() => {
    const collapsing = spacerHeight === 0 && prevSpacerRef.current > 0;
    prevSpacerRef.current = spacerHeight;
    if (!collapsing) return;

    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (autoScrollRef.current) {
      // User was already at the bottom — keep them there
      el.scrollTop = maxScroll;
    } else {
      // User was reading — clamp to valid range without jumping further down
      el.scrollTop = Math.min(savedScrollTopRef.current, maxScroll);
    }
  }, [spacerHeight]);

  // ── Callback ref for auto-scroll ───────────────────────────
  // Only auto-scrolls when NOT actively streaming/thinking.
  // During streaming the user reads at their own pace.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const bottomAnchorRef = useCallback(
    (el: HTMLDivElement | null) => {
      // Do NOT auto-scroll during streaming — user reads at their own pace
      if (isActive) return;
      if (el && autoScrollRef.current) {
        el.scrollIntoView({ block: 'end', behavior: 'auto' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, isStreaming, streamingContent, showThinkingIndicator, spacerHeight, isActive],
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
                  {renderMarkdown(streamingContent)}
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
