'use client';

import { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useWorkspace } from '../context/workspace-context';
import { ModeToggle } from './mode-toggle';

// Lazy load the heavy mode-specific components
const ChatView = lazy(() => import('../../chat/components/chat-view').then(m => ({ default: m.ChatView })));
const CodeView = lazy(() => import('../../code/components/code-view').then(m => ({ default: m.CodeView })));

function MessageListSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function WorkspaceView() {
  const { mode } = useWorkspace();

  return (
    <div className="relative h-full">
      {/* Mode-specific view with animations */}
      <AnimatePresence mode="wait">
        {mode === 'chat' ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full"
          >
            <Suspense fallback={<MessageListSkeleton />}>
              <ChatView />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full"
          >
            <Suspense fallback={<MessageListSkeleton />}>
              <CodeView />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode toggle button */}
      <ModeToggle />
    </div>
  );
}
