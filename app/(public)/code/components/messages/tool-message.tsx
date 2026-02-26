'use client';

import { Check, ChevronRight, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { ElapsedTimer } from './message-utils';
import type { useScopedI18n } from '@/locales/client';

function isEditWithDiff(toolName: string, isComplete: boolean, toolInput?: Record<string, unknown>): boolean {
  if (!isComplete || !toolInput) return false;
  const name = toolName.toLowerCase();
  if (name !== 'edit' && name !== 'write') return false;
  return typeof toolInput.file_path === 'string' && (typeof toolInput.old_string === 'string' || typeof toolInput.new_string === 'string');
}

export interface ToolUseMessageProps {
  toolName: string;
  isComplete: boolean;
  ts: number;
  durationMs?: number;
  toolInput?: Record<string, unknown>;
  onTapDiff?: (_input: Record<string, unknown>) => void;
  t: ReturnType<typeof useScopedI18n<'code.messages'>>;
}

export function ToolUseMessage({ toolName, isComplete, ts, durationMs, toolInput, onTapDiff, t }: ToolUseMessageProps) {
  const canShowDiff = isEditWithDiff(toolName, isComplete, toolInput);
  const Wrapper = canShowDiff ? 'button' : 'div';

  return (
    <div className="flex justify-start">
      <Wrapper
        {...(canShowDiff ? { onClick: () => onTapDiff?.(toolInput!) } : {})}
        className={cn(
          'flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2',
          canShowDiff && 'cursor-pointer transition-colors hover:bg-muted/90 active:scale-[0.98]',
        )}
      >
        <Terminal className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground/80">{toolName}</span>
        {isComplete ? (
          <>
            <Badge variant="outline" className="h-5 gap-0.5 border-custom-green/50 bg-custom-green/15 px-1.5 text-[10px] text-custom-green">
              <Check className="size-2.5" />{t('toolComplete')}
            </Badge>
            <ElapsedTimer startTs={ts} stopped durationMs={durationMs} />
          </>
        ) : (
          <>
            <Loader variant="dots" size={18} />
            <ElapsedTimer startTs={ts} />
          </>
        )}
        {canShowDiff && <ChevronRight className="size-3 text-muted-foreground/60" />}
      </Wrapper>
    </div>
  );
}
