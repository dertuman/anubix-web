'use client';

import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import type { CodeMessage } from '@/types/code';
import { cn } from '@/lib/utils';
import type { useScopedI18n } from '@/locales/client';

export interface ResultMessageProps {
  message: CodeMessage & { type: 'result' };
  isFree?: boolean;
  t: ReturnType<typeof useScopedI18n<'code.messages'>>;
}

export function ResultMessage({ message, isFree, t }: ResultMessageProps) {
  const totalTokens = (message.inputTokens ?? 0) + (message.outputTokens ?? 0);

  return (
    <div className="flex justify-start">
      <div className={cn('flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-2.5', message.cancelled ? 'bg-caution/5' : 'bg-muted/60')}>
        {!message.cancelled ? <CheckCircle className="size-3.5 text-primary" /> : <AlertTriangle className="size-3.5 text-caution" />}
        {isFree && <span className="flex items-center gap-1 text-xs font-medium text-primary"><Zap className="size-3" />{t('free')}</span>}
        {message.duration != null && <span className="text-xs text-muted-foreground">{(message.duration / 1000).toFixed(1)}s</span>}
        {totalTokens > 0 && <span className="text-xs text-muted-foreground">{totalTokens.toLocaleString()} {t('tokens')}</span>}
        {message.cost != null && message.cost > 0 && <span className="text-xs text-muted-foreground/60">~${message.cost.toFixed(4)}</span>}
      </div>
    </div>
  );
}
