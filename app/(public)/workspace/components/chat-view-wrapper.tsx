'use client';

import { ChatView } from '../../chat/components/chat-view';
import { useAuth } from '@clerk/nextjs';
import { useWorkspace } from '../context/workspace-context';
import { ModeToggle } from './mode-toggle';
import { DemoPreviewOverlay } from './demo-preview-overlay';
import { MOCK_CHAT_MESSAGES, MOCK_CHAT_CONVERSATIONS } from '@/lib/demo-data';

/**
 * Wrapper for ChatView in workspace context
 * Shows demo preview with mock data for unauthenticated users
 * In demo mode, allows one prompt before requiring sign-in
 */
export function ChatViewWrapper() {
  const { isSignedIn } = useAuth();
  const { isDemoMode, isDemoPreview, incrementDemoPromptCount } = useWorkspace();

  // Track demo prompts for unauthenticated users
  const handlePromptSent = () => {
    if (!isSignedIn && isDemoMode) {
      incrementDemoPromptCount();
    }
  };

  // For unauthenticated users NOT in demo mode, show demo preview with mock data
  if (isDemoPreview) {
    return (
      <div className="relative h-full">
        <ChatView
          modeToggle={<ModeToggle variant="sidebar" />}
          onPromptSent={handlePromptSent}
          demoPreviewMode={true}
          mockMessages={MOCK_CHAT_MESSAGES}
          mockConversations={MOCK_CHAT_CONVERSATIONS}
        />
        <DemoPreviewOverlay />
      </div>
    );
  }

  // For authenticated users OR demo mode users, show full ChatView with mode toggle
  return <ChatView modeToggle={<ModeToggle variant="sidebar" />} onPromptSent={handlePromptSent} />;
}
