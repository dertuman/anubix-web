'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './markdown-content';
import { MessageActions } from './message-actions';

function CollapsibleText({ text, maxLines = 30, isStreaming }: { text: string; maxLines?: number; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  const needsCollapse = lines.length > maxLines;
  const displayText = needsCollapse && !expanded ? lines.slice(0, maxLines).join('\n') + '\n...' : trimmed;

  return (
    <div>
      <MarkdownContent text={displayText} isStreaming={isStreaming} />
      {needsCollapse && (
        <div className="mt-2 flex justify-center">
          <button onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
            <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Show less' : `Show all ${lines.length} lines`}
          </button>
        </div>
      )}
    </div>
  );
}

export interface AssistantTextMessageProps {
  text: string;
  isComplete: boolean;
}

export function AssistantTextMessage({ text, isComplete }: AssistantTextMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-1.5 overflow-hidden rounded-xl rounded-bl-none bg-muted px-4 py-2.5">
        <div className="min-w-0 flex-1 wrap-break-word">
          <CollapsibleText text={text} isStreaming={!isComplete} />
          {!isComplete && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground/60" />}
        </div>
        <MessageActions text={text} />
      </div>
    </div>
  );
}
