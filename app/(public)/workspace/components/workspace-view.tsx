'use client';

import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useUserData } from '@/context/UserDataContext';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { useClerkSupabaseClient } from '@/lib/supabase/client';

import { useClaudeCodeContext } from '../context/claude-code-context';
import { useEnvironmentDialog } from '../context/environment-dialog-context';
import { useWorkspace } from '../context/workspace-context';
import { EnvironmentDialog } from './environment-dialog';
import { LoginPrompt } from './login-prompt';

// Lazy load the heavy mode-specific components with workspace wrappers
const ChatViewWrapper = lazy(() =>
  import('./chat-view-wrapper').then((m) => ({ default: m.ChatViewWrapper }))
);
const CodeViewWrapper = lazy(() =>
  import('./code-view-wrapper').then((m) => ({ default: m.CodeViewWrapper }))
);

function MessageListSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}

// Context to trigger login prompt from child components
interface LoginPromptContextValue {
  showLoginPrompt: () => void;
}

const LoginPromptContext = createContext<LoginPromptContextValue | undefined>(
  undefined
);

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
  const clerk = useClerk();
  const { profile } = useUserData();
  const supabase = useClerkSupabaseClient();

  const [subscriptionPromptOpen, setSubscriptionPromptOpen] = useState(false);
  const [subscriptionPromptMessage, setSubscriptionPromptMessage] =
    useState<string>();
  const { isOpen: isEnvironmentDialogOpen, hideEnvironmentDialog } =
    useEnvironmentDialog();
  const { status, connect, connectionError } = useClaudeCodeContext();

  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // ── Check subscription status for logged-in users ──────────
  // Wait for profile to load before checking — admin bypass depends on it.
  const profileLoaded = profile !== undefined && profile !== null;
  const isAdmin = !!profile?.is_admin;

  const { data: hasActiveSubscription, isLoading: subscriptionLoading } =
    useQuery({
      queryKey: ['subscription-check', userEmail, isAdmin],
      queryFn: async () => {
        if (!userEmail || !supabase) return false;

        // Admins always bypass subscription check
        if (isAdmin) return true;

        const { data } = await supabase
          .from('subscriptions')
          .select('is_active, billing_interval')
          .eq('email', userEmail)
          .single();

        if (!data || !data.is_active) return false;
        if (
          !data.billing_interval ||
          !['monthly', 'annual'].includes(data.billing_interval)
        )
          return false;
        return true;
      },
      // Only run after profile has loaded so we know admin status
      enabled: !!isSignedIn && !!userEmail && !!supabase && profileLoaded,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

  const showLoginPrompt = () => {
    clerk.openSignIn({ forceRedirectUrl: '/workspace', signUpForceRedirectUrl: '/workspace' });
  };

  const showSubscriptionPrompt = (message?: string) => {
    setSubscriptionPromptMessage(message);
    setSubscriptionPromptOpen(true);
  };

  // Intercept interactions for logged-in users without subscription
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Wait for both profile and subscription check to finish loading
    if (subscriptionLoading || !profileLoaded) return;
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
  }, [
    isSignedIn,
    isLoaded,
    hasActiveSubscription,
    subscriptionLoading,
    profileLoaded,
  ]);

  // Show login prompt after first prompt in demo mode
  useEffect(() => {
    if (!isSignedIn && isDemoMode && demoPromptCount >= 1) {
      clerk.openSignIn({ forceRedirectUrl: '/workspace', signUpForceRedirectUrl: '/workspace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        {/* Subscription prompt */}
        <LoginPrompt
          isOpen={subscriptionPromptOpen}
          onClose={() => setSubscriptionPromptOpen(false)}
          message={subscriptionPromptMessage}
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
