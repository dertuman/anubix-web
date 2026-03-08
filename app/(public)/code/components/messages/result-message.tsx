'use client';

import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import type { CodeMessage } from '@/types/code';
import { cn } from '@/lib/utils';
import type { useScopedI18n } from '@/locales/client';
import { renderMarkdown } from './message-utils';

export interface ResultMessageProps {
  message: CodeMessage & { type: 'result' };
  isFree?: boolean;
  t: ReturnType<typeof useScopedI18n<'code.messages'>>;
}

export function ResultMessage({ message, isFree, t }: ResultMessageProps) {
  const totalTokens = (message.inputTokens ?? 0) + (message.outputTokens ?? 0);
  const hasResultText = !!message.resultText?.trim();

  return (
    <div className="space-y-2">
      {/* Show command / slash-command output when present */}
      {hasResultText && (
        <div className="flex justify-start">
          <div className="overflow-hidden rounded-xl rounded-bl-none bg-muted px-4 py-2.5">
            <div className="min-w-0 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">
              {renderMarkdown(message.resultText)}
            </div>
          </div>
        </div>
      )}

      {/* Stats badge */}
      <div className="flex justify-start">
        <div className={cn('flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-2.5', message.cancelled ? 'bg-caution/5' : 'bg-muted/60')}>
          {!message.cancelled ? <CheckCircle className="size-3.5 text-primary" /> : <AlertTriangle className="size-3.5 text-caution" />}
          {isFree && <span className="flex items-center gap-1 text-xs font-medium text-primary"><Zap className="size-3" />{t('free')}</span>}
          {message.duration != null && <span className="text-xs text-muted-foreground">{(message.duration / 1000).toFixed(1)}s</span>}
          {totalTokens > 0 && <span className="text-xs text-muted-foreground">{totalTokens.toLocaleString()} {t('tokens')}</span>}
          {message.cost != null && message.cost > 0 && <span className="text-xs text-muted-foreground/60">~${message.cost.toFixed(4)}</span>}
        </div>
      </div>
    </div>
  );
}
