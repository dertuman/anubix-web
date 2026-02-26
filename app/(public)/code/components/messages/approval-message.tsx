'use client';

import { useState } from 'react';
import { Check, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { useScopedI18n } from '@/locales/client';

export interface ApprovalRequestMessageProps {
  toolName: string;
  toolInput?: Record<string, unknown>;
  onApprove: () => void;
  onDeny: () => void;
  t: ReturnType<typeof useScopedI18n<'code.messages'>>;
}

export function ApprovalRequestMessage({ toolName, toolInput, onApprove, onDeny, t }: ApprovalRequestMessageProps) {
  const [decided, setDecided] = useState(false);
  const inputStr = toolInput ? JSON.stringify(toolInput, null, 2) : null;

  return (
    <div className="flex justify-start">
      <div className="w-full space-y-2.5 rounded-xl border border-caution/20 bg-caution/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-caution" />
          <span className="text-sm font-medium">{toolName}</span>
        </div>
        {inputStr && <pre className="custom-scrollbar max-h-40 overflow-auto rounded-lg bg-background/60 p-2.5 text-xs leading-relaxed">{inputStr}</pre>}
        {!decided ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setDecided(true); onApprove(); }} className="h-7 gap-1 rounded-lg px-3 text-xs"><Check className="size-3" />{t('approve')}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDecided(true); onDeny(); }} className="h-7 gap-1 rounded-lg px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"><X className="size-3" />{t('deny')}</Button>
          </div>
        ) : (
          <Badge variant="secondary" className="text-[10px]"><Check className="mr-1 size-3" />{t('answered')}</Badge>
        )}
      </div>
    </div>
  );
}
