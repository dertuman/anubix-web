'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, MessageSquare } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import type { CodeMessage as CodeMessageType, CodeToolUseMessage } from '@/types/code';
import { Button } from '@/components/ui/button';
import { CodeMessage, ToolUseGroup, ToolUseSuperGroup } from './code-message';
import type { ToolUseGroupData, ToolUseSuperGroupData } from './code-message';

// ── Grouping logic ──────────────────────────────────────────

type MessageListItem =
  | { kind: 'single'; message: CodeMessageType }
  | { kind: 'tool_use_group'; group: ToolUseGroupData }
  | { kind: 'tool_use_super_group'; group: ToolUseSuperGroupData };

function groupMessages(messages: CodeMessageType[]): MessageListItem[] {
  const result: MessageListItem[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];
    if (msg.type !== 'tool_use') { result.push({ kind: 'single', message: msg }); i++; continue; }

    const run: CodeToolUseMessage[] = [msg];
    let j = i + 1;
    while (j < messages.length && messages[j].type === 'tool_use') { run.push(messages[j] as CodeToolUseMessage); j++; }

    const allSameType = run.every((m) => m.toolName === run[0].toolName);

    if (run.length === 1) {
      result.push({ kind: 'single', message: msg });
    } else if (run.length === 2 && !allSameType) {
      result.push({ kind: 'single', message: run[0] }, { kind: 'single', message: run[1] });
    } else if (allSameType) {
      const allComplete = run.every((m) => m.isComplete);
      const activeMessage = !allComplete ? [...run].reverse().find((m) => !m.isComplete) ?? null : null;
      result.push({ kind: 'tool_use_group', group: { id: `group-${run[0].id}`, toolName: run[0].toolName, messages: run, allComplete, firstTs: run[0].ts, activeMessage } });
    } else {
      const allComplete = run.every((m) => m.isComplete);
      const activeMessage = !allComplete ? [...run].reverse().find((m) => !m.isComplete) ?? null : null;
      const toolBreakdown: Record<string, number> = {};
      for (const m of run) toolBreakdown[m.toolName] = (toolBreakdown[m.toolName] ?? 0) + 1;
      result.push({ kind: 'tool_use_super_group', group: { id: `super-${run[0].id}`, messages: run, allComplete, firstTs: run[0].ts, activeMessage, toolBreakdown } });
    }
    i = j;
  }
  return result;
}

// ── Component ───────────────────────────────────────────────

interface CodeMessageListProps {
  messages: CodeMessageType[];
  isFree?: boolean;
  isBusy?: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onAnswer: (_answers: Record<string, string>) => void;
  questionSelectionsMap?: Map<string, Record<number, string>>;
  onQuestionSelect?: (_messageId: string, _selections: Record<number, string>) => void;
}

export const CodeMessageList = memo(function CodeMessageList({ messages, isFree, isBusy: _isBusy, onApprove, onDeny, onAnswer, questionSelectionsMap, onQuestionSelect }: CodeMessageListProps) {
  const t = useScopedI18n('code.messages');
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
    if (autoScrollRef.current) requestAnimationFrame(() => scrollToBottom(false));
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (isUserScrollRef.current) autoScrollRef.current = isNearBottom;
    setShowScrollBtn(!isNearBottom);
    isUserScrollRef.current = true;
  }, []);

  const groupedItems = useMemo(() => groupMessages(messages), [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <MessageSquare className="size-10 opacity-40" />
        <p className="text-sm">{t('noMessages')}</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="custom-scrollbar relative flex-1 overflow-y-auto" onScroll={handleScroll}>
      <div className="mx-auto space-y-4 px-4 pb-6 pt-6">
        {groupedItems.map((item) => {
          if (item.kind === 'single') {
            return (
              <CodeMessage
                key={item.message.id}
                message={item.message}
                isFree={isFree}
                onApprove={onApprove}
                onDeny={onDeny}
                onAnswer={onAnswer}
                questionSelections={item.message.type === 'question' ? questionSelectionsMap?.get(item.message.id) : undefined}
                onQuestionSelect={onQuestionSelect}
              />
            );
          }
          if (item.kind === 'tool_use_group') return <ToolUseGroup key={item.group.id} group={item.group} t={t} />;
          return <ToolUseSuperGroup key={item.group.id} group={item.group} t={t} />;
        })}
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="sticky bottom-3 left-1/2 z-10 mx-auto w-fit -translate-x-1/2">
            <Button size="sm" onClick={() => scrollToBottom(true)} className="gap-1 rounded-full border border-border/50 bg-background shadow-lg hover:bg-accent">
              <ArrowDown className="size-3" />
              {t('scrollToBottom')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
