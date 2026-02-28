'use client';

import { useEffect, useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { X, LogIn, Loader2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  /** 'login' shows sign-in buttons, 'subscription' shows subscription CTA */
  variant?: 'login' | 'subscription';
}

export function LoginPrompt({ isOpen, onClose, message, variant = 'login' }: LoginPromptProps) {
  const { signIn } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);

  // Close on Escape key (only for login variant — subscription is non-dismissible)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && variant !== 'subscription') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, variant]);

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/workspace',
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    window.location.href = '/sign-in?redirect_url=/workspace';
  };

  const handleGetSubscription = () => {
    window.location.href = '/#pricing';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — non-clickable for subscription variant */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={variant !== 'subscription' ? onClose : undefined}
          />

          {/* Popup - Mobile bottom sheet, Desktop center modal */}
          <div className="fixed inset-0 z-[101] flex items-end justify-center md:items-center md:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md rounded-t-2xl bg-background p-6 shadow-2xl md:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button — hidden for subscription variant (non-dismissible) */}
              {variant !== 'subscription' && (
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              )}

              {variant === 'subscription' ? (
                /* ── Subscription Required Content ──────────────── */
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                        <CreditCard className="size-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold">Subscription required</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {message || 'You need an active subscription to use the workspace. Subscribe to get full access to chat, code, and cloud environments.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Button
                      onClick={handleGetSubscription}
                      className="w-full gap-2"
                      size="lg"
                    >
                      <CreditCard className="size-4" />
                      View Plans & Subscribe
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Already subscribed?{' '}
                    <button
                      onClick={() => window.location.reload()}
                      className="text-primary hover:underline"
                    >
                      Refresh to sync
                    </button>
                  </p>
                </div>
              ) : (
                /* ── Login Content ──────────────────────────────── */
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                        <LogIn className="size-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold">Sign in to continue</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {message || 'You need to sign in to use this feature'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Google OAuth button */}
                    <Button
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full gap-3"
                      size="lg"
                    >
                      {isLoading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <svg className="size-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                      Continue with Google
                    </Button>

                    {/* Email sign in */}
                    <Button
                      onClick={handleEmailSignIn}
                      variant="outline"
                      className="w-full gap-2"
                      size="lg"
                      disabled={isLoading}
                    >
                      <LogIn className="size-4" />
                      Sign in with Email
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <a href="/sign-up?redirect_url=/workspace" className="text-primary hover:underline">
                      Sign up
                    </a>
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
