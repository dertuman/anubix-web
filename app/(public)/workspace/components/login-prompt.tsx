'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function LoginPrompt({
  isOpen,
  onClose: _onClose,
  message,
}: LoginPromptProps) {
  // Non-dismissible — no Escape key handling
  useEffect(() => {
    // Prevent scrolling when open
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleGetSubscription = () => {
    window.location.href = '/#pricing';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — non-clickable (subscription is non-dismissible) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm"
          />

          {/* Popup - Mobile bottom sheet, Desktop center modal */}
          <div className="fixed inset-0 z-101 flex items-end justify-center md:items-center md:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-background relative w-full max-w-md rounded-t-2xl p-6 shadow-2xl md:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                      <CreditCard className="text-primary size-5" />
                    </div>
                    <h2 className="text-xl font-semibold">
                      Subscription required
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {message ||
                      'You need an active subscription to use the workspace. Subscribe to get full access to chat, code, and cloud environments.'}
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

                <p className="text-muted-foreground text-center text-xs">
                  Already subscribed?{' '}
                  <button
                    onClick={() => window.location.reload()}
                    className="text-primary hover:underline"
                  >
                    Refresh to sync
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
