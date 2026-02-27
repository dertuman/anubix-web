'use client';

import { lazy, Suspense, useState, useEffect, createContext, useContext } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useClerkSupabaseClient } from '@/lib/supabase/client';
import { useWorkspace } from '../context/workspace-context';
import { useEnvironmentDialog } from '../context/environment-dialog-context';
import { useClaudeCodeContext } from '../context/claude-code-context';
import { useUserData } from '@/context/UserDataContext';
import { LoginPrompt } from './login-prompt';
import { EnvironmentDialog } from './environment-dialog';

// Lazy load the heavy mode-specific components with workspace wrappers
const ChatViewWrapper = lazy(() => import('./chat-view-wrapper').then(m => ({ default: m.ChatViewWrapper })));
const CodeViewWrapper = lazy(() => import('./code-view-wrapper').then(m => ({ default: m.CodeViewWrapper })));

function MessageListSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Context to trigger login prompt from child components
interface LoginPromptContextValue {
  showLoginPrompt: (_message?: string) => void;
}

const LoginPromptContext = createContext<LoginPromptContextValue | undefined>(undefined);

export function useLoginPrompt() {
  const context = useContext(LoginPromptContext);
  if (!context) {
    throw new Error('useLoginPrompt must be used within WorkspaceView');
  }
  return context;
}

export function WorkspaceView() {
  const { mode, isDemoMode, demoPromptCount } = useWorkspace();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { profile } = useUserData();
  const supabase = useClerkSupabaseClient();

  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string>();
  const [loginPromptVariant, setLoginPromptVariant] = useState<'login' | 'subscription'>('login');
  const { isOpen: isEnvironmentDialogOpen, hideEnvironmentDialog } = useEnvironmentDialog();
  const { status, connect, connectionError } = useClaudeCodeContext();

  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // ── Check subscription status for logged-in users ──────────
  const { data: hasActiveSubscription } = useQuery({
    queryKey: ['subscription-check', userEmail],
    queryFn: async () => {
      if (!userEmail || !supabase) return false;

      // Admins bypass subscription check
      if (profile?.is_admin) return true;

      const { data } = await supabase
        .from('subscriptions')
        .select('is_active, billing_interval')
        .eq('email', userEmail)
        .single();

      if (!data || !data.is_active) return false;
      if (!data.billing_interval || !['monthly', 'annual'].includes(data.billing_interval)) return false;
      return true;
    },
    enabled: !!isSignedIn && !!userEmail && !!supabase,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const showLoginPrompt = (message?: string) => {
    setLoginPromptMessage(message);
    setLoginPromptOpen(true);
  };

  const showSubscriptionPrompt = (message?: string) => {
    setLoginPromptVariant('subscription');
    setLoginPromptMessage(message);
    setLoginPromptOpen(true);
  };

  // Intercept interactions for unauthenticated users
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn && !isDemoMode) {
      // Add click interceptor to show login when clicking on inputs/buttons
      const handleInteraction = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check if clicked element is an input, textarea, or button within workspace
        if (
          target.closest('textarea') ||
          target.closest('input') ||
          (target.closest('button') && !target.closest('[data-allow-anon]'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          setLoginPromptVariant('login');
          showLoginPrompt();
        }
      };

      document.addEventListener('click', handleInteraction, true);
      return () => document.removeEventListener('click', handleInteraction, true);
    }
  }, [isSignedIn, isLoaded, isDemoMode]);

  // Intercept interactions for logged-in users without subscription
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Only intercept if we've confirmed no subscription (not still loading)
    if (hasActiveSubscription !== false) return;

    const handleInteraction = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Intercept textarea, input interactions, and certain action buttons
      if (
        target.closest('textarea') ||
        target.closest('input[type="text"]') ||
        target.closest('[data-requires-subscription]')
      ) {
        e.preventDefault();
        e.stopPropagation();
        showSubscriptionPrompt(
          'You need an active subscription to use the workspace. Subscribe to get full access to chat, code, and cloud environments.'
        );
      }
    };

    document.addEventListener('click', handleInteraction, true);
    return () => document.removeEventListener('click', handleInteraction, true);
  }, [isSignedIn, isLoaded, hasActiveSubscription]);

  // Show login prompt after first prompt in demo mode
  useEffect(() => {
    if (!isSignedIn && isDemoMode && demoPromptCount >= 1) {
      setLoginPromptVariant('login');
      showLoginPrompt('Sign in to continue using the workspace and send more prompts');
    }
  }, [isSignedIn, isDemoMode, demoPromptCount]);

  return (
    <LoginPromptContext.Provider value={{ showLoginPrompt }}>
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
                <ChatViewWrapper />
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
                <CodeViewWrapper />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login/subscription prompt */}
        <LoginPrompt
          isOpen={loginPromptOpen}
          onClose={() => setLoginPromptOpen(false)}
          message={loginPromptMessage}
          variant={loginPromptVariant}
        />

        {/* Environment connection dialog for code mode */}
        {mode === 'code' && (
          <EnvironmentDialog
            isOpen={isEnvironmentDialogOpen}
            onClose={hideEnvironmentDialog}
            onConnected={(url, key) => {
              connect(url, key);
              hideEnvironmentDialog();
            }}
            connectionStatus={status === 'connecting' ? 'disconnected' : status}
            connectionError={connectionError ?? undefined}
          />
        )}
      </div>
    </LoginPromptContext.Provider>
  );
}
