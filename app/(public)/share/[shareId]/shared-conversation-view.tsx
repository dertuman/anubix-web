'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Copy,
  Check,
  MessageSquare,
  Share2,
  Clock,
} from 'lucide-react';

import type { ChatMessage as ChatMessageType, StoredFileAttachment } from '@/types/chat';
import { AI_MODELS_MAP } from '@/types/chat';
import { formatFileSize } from '@/lib/file-utils';
import { getCategoryIcon } from '@/lib/ui-utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/app/(public)/code/components/messages/markdown-content';

// ── Types ──────────────────────────────────────────────────────

interface SharedConversation {
  id: string;
  title: string;
  model: string;
  message_count: number;
  created_at: string;
}

interface SharedConversationViewProps {
  conversation: SharedConversation;
  messages: ChatMessageType[];
}

// ── Collapsible text ───────────────────────────────────────────

function CollapsibleText({ text, maxLines = 30 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  const needsCollapse = lines.length > maxLines;
  const displayText =
    needsCollapse && !expanded ? lines.slice(0, maxLines).join('\n') + '\n...' : trimmed;

  return (
    <div>
      <MarkdownContent text={displayText} />
      {needsCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-primary/80 transition-colors hover:bg-primary/15 hover:text-primary"
        >
          <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

// ── Timestamp formatter ────────────────────────────────────────

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (
    date.getDate() !== now.getDate() ||
    date.getMonth() !== now.getMonth() ||
    date.getFullYear() !== now.getFullYear()
  ) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }
  return time;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Copy button ────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1 text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 hover:bg-muted/80 hover:text-foreground/80"
      title="Copy text"
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
    </button>
  );
}

// ── User message ───────────────────────────────────────────────

function UserMessage({ message }: { message: ChatMessageType }) {
  const files = useMemo(() => (message.files ?? []) as StoredFileAttachment[], [message.files]);
  const nonImageFiles = useMemo(() => files.filter((f) => f.category !== 'image'), [files]);
  const imageFiles = useMemo(() => files.filter((f) => f.category === 'image' && f.data), [files]);
  const legacyImages = imageFiles.length > 0 ? [] : (message.images ?? []);

  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] flex-col gap-2 sm:max-w-[75%]">
        {nonImageFiles.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {nonImageFiles.map((f, i) => {
              const Icon = getCategoryIcon(f.category);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/50 px-2.5 py-1.5"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="max-w-[160px] truncate text-xs font-medium">{f.name}</span>
                    {f.size > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatFileSize(f.size)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {message.content && (
          <div className="group flex items-start gap-1.5 self-end overflow-hidden rounded-xl rounded-br-none bg-user-bubble px-4 py-2.5 text-user-bubble-foreground ring-1 ring-user-bubble-ring">
            <p className="wrap-break-word min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
            <CopyButton text={message.content} />
          </div>
        )}
        {legacyImages.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {legacyImages.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64}`}
                alt=""
                className="max-h-48 max-w-[300px] rounded-xl object-cover"
              />
            ))}
          </div>
        )}
        {imageFiles.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {imageFiles.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={f.data} alt={f.name} className="max-h-48 max-w-[300px] rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Assistant message ──────────────────────────────────────────

function AssistantMessage({
  message,
  modelInfo,
}: {
  message: ChatMessageType;
  modelInfo: { name: string } | null;
}) {
  return (
    <div className="flex justify-start">
      <div className="group max-w-[85%] overflow-hidden rounded-xl rounded-bl-none bg-muted px-4 py-2.5 sm:max-w-[75%]">
        {modelInfo && (
          <Badge variant="secondary" className="mb-1.5 w-fit text-[10px]">
            {modelInfo.name}
          </Badge>
        )}
        <div className="flex items-start gap-1.5">
          <div className="wrap-break-word min-w-0 flex-1">
            <CollapsibleText text={message.content} />
          </div>
          {message.content && <CopyButton text={message.content} />}
        </div>
      </div>
    </div>
  );
}

// ── Shared message item ────────────────────────────────────────

function SharedMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  const modelInfo = message.model ? AI_MODELS_MAP[message.model] : null;

  return (
    <div>
      <p
        className={cn(
          'mb-0.5 text-[10px] text-muted-foreground/50',
          isUser ? 'text-right' : 'text-left',
        )}
      >
        {formatTimestamp(message.created_at)}
      </p>
      {isUser ? (
        <UserMessage message={message} />
      ) : (
        <AssistantMessage message={message} modelInfo={modelInfo} />
      )}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────

export function SharedConversationView({ conversation, messages }: SharedConversationViewProps) {
  const modelInfo = AI_MODELS_MAP[conversation.model];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Share2 className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold leading-tight text-foreground">
                {conversation.title}
              </h1>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                {modelInfo && (
                  <>
                    <span>{modelInfo.name}</span>
                    <span className="text-border">·</span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3" />
                  {conversation.message_count}
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDate(conversation.created_at)}
                </span>
              </div>
            </div>
          </div>
          <Link href="/" prefetch={false}>
            <Button variant="outline" size="sm" className="shrink-0 text-xs">
              Try Anubix
            </Button>
          </Link>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="space-y-3">
            {messages.map((msg) => (
              <SharedMessage key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>Shared from</span>
          <Link
            href="/"
            className="font-medium text-primary transition-colors hover:text-primary/80"
            prefetch={false}
          >
            Anubix
          </Link>
        </div>
      </footer>
    </div>
  );
}
