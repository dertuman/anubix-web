'use client';

import { ChatView } from '../../chat/components/chat-view';
import { useAuth } from '@clerk/nextjs';
import { useWorkspace } from '../context/workspace-context';
import { ModeToggle } from './mode-toggle';

/**
 * Wrapper for ChatView in workspace context
 * Shows blank slate for unauthenticated users in non-demo mode
 * In demo mode, allows one prompt before requiring sign-in
 */
export function ChatViewWrapper() {
  const { isSignedIn } = useAuth();
  const { isDemoMode, incrementDemoPromptCount } = useWorkspace();

  // Track demo prompts for unauthenticated users
  const handlePromptSent = () => {
    if (!isSignedIn && isDemoMode) {
      incrementDemoPromptCount();
    }
  };

  // For unauthenticated users NOT in demo mode, show blank slate
  if (!isSignedIn && !isDemoMode) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-2xl font-bold text-primary">A</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Chat Mode</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to start conversing with AI models like GPT, Gemini, and Claude.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // For authenticated users OR demo mode users, show full ChatView with mode toggle
  return <ChatView modeToggle={<ModeToggle variant="sidebar" />} onPromptSent={handlePromptSent} />;
}
