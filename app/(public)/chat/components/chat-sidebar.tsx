'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  EllipsisVertical,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  X,
} from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import type { ChatConversation } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmationDialog } from '@/components/confirmation-dialog';

// ── Helpers ──────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Sidebar ──────────────────────────────────────────────────

interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (_id: string) => void;
  onNewChat: () => void;
  onDelete: (_id: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  modeToggle?: React.ReactNode;
}

export const ChatSidebar = memo(function ChatSidebar({
  conversations,
  selectedId,
  isLoading,
  onSelect,
  onNewChat,
  onDelete,
  mobileOpen,
  onMobileClose,
  modeToggle,
}: ChatSidebarProps) {
  const t = useScopedI18n('chat.sidebar');
  const [collapsed, setCollapsed] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    onDelete(id);
    setDeleteId(null);
  };

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-2 p-3">
        {/* Logo home link + mode toggle */}
        <Link href="/" className="flex items-center gap-2 px-1 py-0.5">
          <Image src="/logo.webp" alt="Anubix" width={22} height={22} />
          <span className="text-sm font-medium tracking-tight text-foreground">Anubix</span>
        </Link>
        {modeToggle && <div className="w-full">{modeToggle}</div>}

        {/* New chat button and collapse controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="border-border/30 text-foreground hover:bg-accent flex-1 gap-2 bg-transparent"
          >
            <MessageSquarePlus className="size-4" />
            {t('newChat')}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground hover:text-foreground hidden size-8 shrink-0 md:flex"
          >
            <PanelLeftClose className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="text-muted-foreground hover:text-foreground size-8 shrink-0 md:hidden"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 [&>[data-radix-scroll-area-viewport]>div]:block!">
        <div className="space-y-0.5 px-2 pb-2">
          {isLoading ? (
            <div className="text-muted-foreground px-3 py-6 text-center text-sm">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t('noConversations')}
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex cursor-pointer items-center gap-1 overflow-hidden rounded-lg py-2 pr-1 pl-3 text-sm transition-colors',
                  selectedId === conv.id
                    ? 'bg-foreground/6 text-foreground'
                    : 'text-muted-foreground hover:bg-foreground/4 hover:text-foreground',
                )}
                onClick={() => {
                  onSelect(conv.id);
                  onMobileClose();
                }}
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{conv.title}</span>
                  <span className="text-muted-foreground block truncate text-[10px]">
                    {formatRelativeTime(conv.updated_at)}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(conv.id);
                      }}
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );

  const dialogs = (
    <ConfirmationDialog
      isOpen={!!deleteId}
      onOpenChange={(open) => { if (!open) setDeleteId(null); }}
      title={t('delete')}
      description={t('deleteConfirm')}
      confirmButtonText={t('delete')}
      handleConfirm={() => { if (deleteId) handleDelete(deleteId); }}
    />
  );

  if (collapsed) {
    return (
      <>
        <div className="border-border/20 bg-muted/20 hidden h-full w-12 flex-col items-center border-r pt-3 md:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="text-muted-foreground hover:text-foreground size-8"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <div className="border-border/20 bg-muted/20 hidden h-full w-72 flex-col border-r md:flex">
        {sidebarContent}
      </div>
      {mobileOpen && (
        <>
          <div
            className="bg-background/80 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
          />
          <div className="border-border/20 bg-background fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r md:hidden">
            {sidebarContent}
          </div>
        </>
      )}
      {dialogs}
    </>
  );
});

export function MobileSidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="text-muted-foreground size-8 md:hidden"
    >
      <Menu className="size-4" />
    </Button>
  );
}
