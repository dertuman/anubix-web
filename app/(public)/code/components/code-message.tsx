'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Zap } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import type {
  CodeMessage as CodeMessageType,
  CodeToolUseMessage,
} from '@/types/code';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { DiffDrawer } from './diff-drawer';

import { formatTimestamp, ElapsedTimer } from './messages/message-utils';
import { UserMessage } from './messages/user-message';
import { AssistantTextMessage } from './messages/assistant-message';
import { ToolUseMessage } from './messages/tool-message';
import { ApprovalRequestMessage } from './messages/approval-message';
import { QuestionMessage } from './messages/question-message';
import { ResultMessage } from './messages/result-message';
import { ErrorMessage } from './messages/error-message';
import { SystemMessage } from './messages/system-message';

// ── Main component ──────────────────────────────────────────

interface CodeMessageProps {
  message: CodeMessageType;
  isFree?: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
  onAnswer?: (_answers: Record<string, string>) => void;
  questionSelections?: Record<number, string>;
  onQuestionSelect?: (_messageId: string, _selections: Record<number, string>) => void;
}

export const CodeMessage = memo(function CodeMessage({ message, isFree, onApprove, onDeny, onAnswer, questionSelections, onQuestionSelect }: CodeMessageProps) {
  const t = useScopedI18n('code.messages');
  const [diffData, setDiffData] = useState<{ filePath: string; oldString: string; newString: string } | null>(null);

  const handleTapDiff = useCallback((toolInput: Record<string, unknown>) => {
    const filePath = (toolInput.file_path as string) ?? '';
    const oldString = (toolInput.old_string as string) ?? '';
    const newString = (toolInput.new_string as string) ?? '';
    setDiffData({ filePath, oldString, newString });
  }, []);

  const content = useMemo(() => {
    switch (message.type) {
      case 'user': return <UserMessage text={message.text} images={message.images} files={message.files} />;
      case 'assistant_text': return <AssistantTextMessage text={message.text} isComplete={message.isComplete} />;
      case 'tool_use': return <ToolUseMessage toolName={message.toolName} isComplete={message.isComplete} ts={message.ts} durationMs={message.durationMs} toolInput={message.toolInput} onTapDiff={handleTapDiff} t={t} />;
      case 'approval_request': return <ApprovalRequestMessage toolName={message.toolName} toolInput={message.toolInput} onApprove={() => onApprove?.()} onDeny={() => onDeny?.()} t={t} />;
      case 'question': return <QuestionMessage questions={message.questions} onAnswer={(a) => onAnswer?.(a)} initialSelections={questionSelections} onPartialSelect={(s) => onQuestionSelect?.(message.id, s)} />;
      case 'result': return <ResultMessage message={message} isFree={isFree} t={t} />;
      case 'error': return <ErrorMessage error={message.error} subtype={message.subtype} />;
      case 'system': return <SystemMessage text={message.text} />;
      default: return null;
    }
  }, [message, isFree, onApprove, onDeny, onAnswer, questionSelections, onQuestionSelect, handleTapDiff, t]);

  const showTimestamp = message.type !== 'tool_use' && message.type !== 'system';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      {showTimestamp && (
        <p className={cn('mb-0.5 text-[10px] text-muted-foreground/50', message.type === 'user' ? 'text-right' : 'text-left')}>
          {formatTimestamp(message.ts)}
        </p>
      )}
      {content}
      {diffData && (
        <DiffDrawer
          open={!!diffData}
          onOpenChange={(open) => { if (!open) setDiffData(null); }}
          filePath={diffData.filePath}
          oldString={diffData.oldString}
          newString={diffData.newString}
        />
      )}
    </motion.div>
  );
});

// ── Tool-use groups ─────────────────────────────────────────

export interface ToolUseGroupData {
  id: string;
  toolName: string;
  messages: CodeToolUseMessage[];
  allComplete: boolean;
  firstTs: number;
  totalDurationMs?: number;
  activeMessage: CodeToolUseMessage | null;
}

export const ToolUseGroup = memo(function ToolUseGroup({ group, t }: { group: ToolUseGroupData; t: ReturnType<typeof useScopedI18n<'code.messages'>> }) {
  const [expanded, setExpanded] = useState(false);
  const [diffData, setDiffData] = useState<{ filePath: string; oldString: string; newString: string } | null>(null);
  const { toolName, messages, allComplete, firstTs, totalDurationMs, activeMessage } = group;

  const handleTapDiff = useCallback((toolInput: Record<string, unknown>) => {
    setDiffData({
      filePath: (toolInput.file_path as string) ?? '',
      oldString: (toolInput.old_string as string) ?? '',
      newString: (toolInput.new_string as string) ?? '',
    });
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      <div className="flex justify-start">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 transition-colors hover:bg-muted/80">
          <ChevronRight className={cn('size-3 text-muted-foreground transition-transform duration-200', expanded && 'rotate-90')} />
          <span className="text-xs font-medium text-foreground/80">{toolName}</span>
          <span className="text-xs text-muted-foreground">{t('toolGroupCount', { count: messages.length })}</span>
          {allComplete ? (
            <><Badge variant="outline" className="h-5 gap-0.5 border-custom-green/50 bg-custom-green/15 px-1.5 text-[10px] text-custom-green"><Check className="size-2.5" />{t('toolComplete')}</Badge><ElapsedTimer startTs={firstTs} stopped durationMs={totalDurationMs} /></>
          ) : (
            <><Loader variant="dots" size={18} /><ElapsedTimer startTs={firstTs} /></>
          )}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="ml-4 mt-1 space-y-1 overflow-hidden border-l-2 border-border/20 pl-3">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.1 }}>
                <ToolUseMessage toolName={msg.toolName} isComplete={msg.isComplete} ts={msg.ts} durationMs={msg.durationMs} toolInput={msg.toolInput} onTapDiff={handleTapDiff} t={t} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!expanded && activeMessage && (
        <div className="ml-4 mt-1 border-l-2 border-primary/30 pl-3">
          <ToolUseMessage toolName={activeMessage.toolName} isComplete={activeMessage.isComplete} ts={activeMessage.ts} durationMs={activeMessage.durationMs} toolInput={activeMessage.toolInput} onTapDiff={handleTapDiff} t={t} />
        </div>
      )}
      {diffData && (
        <DiffDrawer
          open={!!diffData}
          onOpenChange={(open) => { if (!open) setDiffData(null); }}
          filePath={diffData.filePath}
          oldString={diffData.oldString}
          newString={diffData.newString}
        />
      )}
    </motion.div>
  );
});

export interface ToolUseSuperGroupData {
  id: string;
  messages: CodeToolUseMessage[];
  allComplete: boolean;
  firstTs: number;
  totalDurationMs?: number;
  activeMessage: CodeToolUseMessage | null;
  toolBreakdown: Record<string, number>;
}

export const ToolUseSuperGroup = memo(function ToolUseSuperGroup({ group, t }: { group: ToolUseSuperGroupData; t: ReturnType<typeof useScopedI18n<'code.messages'>> }) {
  const [expanded, setExpanded] = useState(false);
  const [diffData, setDiffData] = useState<{ filePath: string; oldString: string; newString: string } | null>(null);
  const { messages, allComplete, firstTs, totalDurationMs, activeMessage, toolBreakdown } = group;

  const handleTapDiff = useCallback((toolInput: Record<string, unknown>) => {
    setDiffData({
      filePath: (toolInput.file_path as string) ?? '',
      oldString: (toolInput.old_string as string) ?? '',
      newString: (toolInput.new_string as string) ?? '',
    });
  }, []);

  const breakdownStr = Object.entries(toolBreakdown).sort(([, a], [, b]) => b - a).map(([name, n]) => `${name} x${n}`).join(' . ');

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      <div className="flex justify-start">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 transition-colors hover:bg-muted/80">
          <ChevronRight className={cn('size-3 text-muted-foreground transition-transform duration-200', expanded && 'rotate-90')} />
          <Zap className="size-3.5 text-primary/70" />
          <span className="text-xs font-medium text-foreground/80">{t('toolSuperGroupLabel')}</span>
          <span className="text-xs text-muted-foreground">{t('toolSuperGroupCount', { count: messages.length })}</span>
          {allComplete ? (
            <><Badge variant="outline" className="h-5 gap-0.5 border-custom-green/50 bg-custom-green/15 px-1.5 text-[10px] text-custom-green"><Check className="size-2.5" />{t('toolComplete')}</Badge><ElapsedTimer startTs={firstTs} stopped durationMs={totalDurationMs} /></>
          ) : (
            <><Loader variant="dots" size={18} /><ElapsedTimer startTs={firstTs} /></>
          )}
        </button>
      </div>
      <div className="ml-9 mt-0.5"><span className="text-[10px] text-muted-foreground/70">{breakdownStr}</span></div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="ml-4 mt-1 space-y-1 overflow-hidden border-l-2 border-border/20 pl-3">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.1 }}>
                <ToolUseMessage toolName={msg.toolName} isComplete={msg.isComplete} ts={msg.ts} durationMs={msg.durationMs} toolInput={msg.toolInput} onTapDiff={handleTapDiff} t={t} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!expanded && activeMessage && (
        <div className="ml-4 mt-1 border-l-2 border-primary/30 pl-3">
          <ToolUseMessage toolName={activeMessage.toolName} isComplete={activeMessage.isComplete} ts={activeMessage.ts} durationMs={activeMessage.durationMs} toolInput={activeMessage.toolInput} onTapDiff={handleTapDiff} t={t} />
        </div>
      )}
      {diffData && (
        <DiffDrawer
          open={!!diffData}
          onOpenChange={(open) => { if (!open) setDiffData(null); }}
          filePath={diffData.filePath}
          oldString={diffData.oldString}
          newString={diffData.newString}
        />
      )}
    </motion.div>
  );
});
