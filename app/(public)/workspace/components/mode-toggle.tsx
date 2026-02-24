'use client';

import { useEffect } from 'react';
import { MessageSquare, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '../context/workspace-context';

export function ModeToggle() {
  const { mode, setMode } = useWorkspace();

  const toggleMode = () => {
    const newMode = mode === 'chat' ? 'code' : 'chat';
    setMode(newMode);

    // Haptic feedback on mobile (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile FAB */}
      <motion.div
        className="fixed bottom-6 right-6 z-50 md:hidden"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-allow-anon
      >
        <Button
          onClick={toggleMode}
          size="lg"
          data-allow-anon
          className={cn(
            'size-14 rounded-full shadow-lg transition-all',
            mode === 'chat'
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-accent hover:bg-accent/90'
          )}
          title={mode === 'chat' ? 'Switch to Code Mode' : 'Switch to Chat Mode'}
        >
          <motion.div
            key={mode}
            initial={{ rotate: 180, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {mode === 'chat' ? (
              <Terminal className="size-6" />
            ) : (
              <MessageSquare className="size-6" />
            )}
          </motion.div>
        </Button>
      </motion.div>

      {/* Desktop segmented control */}
      <div className="fixed right-4 bottom-4 z-50 hidden md:flex items-center gap-2 rounded-lg bg-background/95 backdrop-blur-sm border border-border p-1 shadow-lg" data-allow-anon>
        <button
          onClick={() => setMode('chat')}
          data-allow-anon
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            mode === 'chat'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5" />
            Chat
          </div>
        </button>
        <button
          onClick={() => setMode('code')}
          data-allow-anon
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            mode === 'code'
              ? 'bg-accent text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-1.5">
            <Terminal className="size-3.5" />
            Code
          </div>
        </button>
      </div>
    </>
  );
}
