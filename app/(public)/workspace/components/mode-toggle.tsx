'use client';

import { useEffect } from 'react';
import { MessageSquare, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '../context/workspace-context';

interface ModeToggleProps {
  variant?: 'sidebar' | 'floating';
  className?: string;
}

export function ModeToggle({ variant = 'floating', className }: ModeToggleProps) {
  const { mode, setMode } = useWorkspace();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setMode(mode === 'chat' ? 'code' : 'chat');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, setMode]);

  // Sidebar variant - inline compact toggle
  if (variant === 'sidebar') {
    return (
      <div className={cn('flex items-center gap-1 rounded-lg bg-muted/30 p-0.5', className)} data-allow-anon>
        <button
          onClick={() => setMode('chat')}
          data-allow-anon
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer',
            mode === 'chat'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title="Switch to Chat Mode"
        >
          <MessageSquare className="size-3.5" />
          <span className="hidden sm:inline">Chat</span>
        </button>
        <button
          onClick={() => setMode('code')}
          data-allow-anon
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer',
            mode === 'code'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title="Switch to Code Mode"
        >
          <Terminal className="size-3.5" />
          <span className="hidden sm:inline">Code</span>
        </button>
      </div>
    );
  }

  // Floating variant - fallback for when no sidebar is present (shouldn't normally show)
  return null;
}
