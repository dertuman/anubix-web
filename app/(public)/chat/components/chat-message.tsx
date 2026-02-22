'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ChevronDown,
  Copy,
} from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import type { ChatMessage as ChatMessageType, StoredFileAttachment } from '@/types/chat';
import { AI_MODELS_MAP } from '@/types/chat';
import { formatFileSize } from '@/lib/file-utils';
import { getCategoryIcon } from '@/lib/ui-utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Helpers ──────────────────────────────────────────────────

function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground/80" title="Actions">
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer gap-2">
          <Copy className="size-3.5" />
          <span>{copied ? 'Copied!' : 'Copy text'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|^---$/gm;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] && match[2]) {
      parts.push(<a key={keyIndex++} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-info underline underline-offset-2 hover:text-info/80">{match[1]}</a>);
    } else if (match[3]) {
      parts.push(<strong key={keyIndex++}>{match[3]}</strong>);
    } else if (match[0] === '---') {
      parts.push(<hr key={keyIndex++} className="my-2 border-border/30" />);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function CollapsibleText({ text, maxLines = 30 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  const needsCollapse = lines.length > maxLines;
  const displayText = needsCollapse && !expanded ? lines.slice(0, maxLines).join('\n') + '\n...' : trimmed;

  return (
    <div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{renderMarkdown(displayText)}</div>
      {needsCollapse && (
        <button onClick={() => setExpanded(!expanded)} className="mt-1 flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-primary/80 transition-colors hover:bg-primary/15 hover:text-primary">
          <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.getDate() !== now.getDate() || date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }
  return time;
}

// ── Main component ──────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export const ChatMessage = memo(function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const modelInfo = message.model ? AI_MODELS_MAP[message.model] : null;

  const content = useMemo(() => {
    if (isUser) return <UserMessage message={message} />;
    return <AssistantMessage message={message} modelInfo={modelInfo} isStreaming={isStreaming} />;
  }, [message, isUser, modelInfo, isStreaming]);

  return (
    <div>
      <p className={cn('mb-0.5 text-[10px] text-muted-foreground/50', isUser ? 'text-right' : 'text-left')}>
        {formatTimestamp(message.created_at)}
      </p>
      {content}
    </div>
  );
});

// ── Sub-components ──────────────────────────────────────────

function UserMessage({ message }: { message: ChatMessageType }) {
  const files = useMemo(() => (message.files ?? []) as StoredFileAttachment[], [message.files]);
  const nonImageFiles = useMemo(() => files.filter((f) => f.category !== 'image'), [files]);
  const imageFiles = useMemo(() => files.filter((f) => f.category === 'image' && f.data), [files]);

  // Legacy images only when no web-format images exist (avoids duplicates
  // for messages that were saved with both `images` and `files` columns)
  const legacyImages = imageFiles.length > 0 ? [] : (message.images ?? []);

  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-2">
        {nonImageFiles.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {nonImageFiles.map((f, i) => {
              const Icon = getCategoryIcon(f.category);
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/50 px-2.5 py-1.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="max-w-[160px] truncate text-xs font-medium">{f.name}</span>
                    {f.size > 0 && <span className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {message.content && (
          <div className="flex items-start gap-1.5 self-end overflow-hidden rounded-xl rounded-br-none bg-user-bubble text-user-bubble-foreground ring-1 ring-user-bubble-ring px-4 py-2.5">
            <p className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            <MessageActions text={message.content} />
          </div>
        )}
        {/* Legacy images from native app (only when no web-format images) */}
        {legacyImages.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {legacyImages.map((img, i) => <img key={i} src={img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64}`} alt="" className="max-h-48 max-w-[300px] rounded-xl object-cover" />)}
          </div>
        )}
        {/* Web file images */}
        {imageFiles.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imageFiles.map((f, i) => <img key={i} src={f.data} alt={f.name} className="max-h-48 max-w-[300px] rounded-xl object-cover" />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ message, modelInfo, isStreaming }: { message: ChatMessageType; modelInfo: { name: string } | null; isStreaming?: boolean }) {
  const t = useScopedI18n('chat.messages');
  void t; // available for future use

  return (
    <div className="flex justify-start">
      <div className="overflow-hidden rounded-xl rounded-bl-none bg-muted px-4 py-2.5">
        {modelInfo && (
          <Badge variant="secondary" className="mb-1.5 w-fit text-[10px]">{modelInfo.name}</Badge>
        )}
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1 wrap-break-word">
            <CollapsibleText text={message.content} />
            {isStreaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground/60" />}
          </div>
          {message.content && <MessageActions text={message.content} />}
        </div>
      </div>
    </div>
  );
}
