'use client';

import { useCallback, useState } from 'react';
import { Check, Copy, Link, Share2 } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import type { ChatConversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ShareDialogProps {
  conversation: ChatConversation;
  onToggleShare: () => Promise<void>;
}

export function ShareDialog({ conversation, onToggleShare }: ShareDialogProps) {
  const t = useScopedI18n('chat.share');
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = conversation.share_id
    ? `${window.location.origin}/share/${conversation.share_id}`
    : null;

  const handleToggle = useCallback(async () => {
    setToggling(true);
    try {
      await onToggleShare();
    } finally {
      setToggling(false);
    }
  }, [onToggleShare]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title={t('title')}>
          <Share2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('toggle')}</p>
              <p className="text-xs text-muted-foreground">
                {conversation.is_shared ? t('description') : t('descriptionDisabled')}
              </p>
            </div>
            <Button
              variant={conversation.is_shared ? 'destructive' : 'default'}
              size="sm"
              onClick={handleToggle}
              disabled={toggling}
            >
              {conversation.is_shared ? t('disable') : t('enable')}
            </Button>
          </div>

          {conversation.is_shared && shareUrl && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('copyLink')}</p>
              <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/50 px-3 py-2">
                <Link className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">{shareUrl}</span>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
