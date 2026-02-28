'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Sparkles, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginPrompt } from './login-prompt';
import { useEnvironmentDialog } from '../context/environment-dialog-context';

export function DemoPreviewOverlay() {
  const { isSignedIn } = useAuth();
  const { showEnvironmentDialog } = useEnvironmentDialog();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleCTAClick = () => {
    if (!isSignedIn) {
      setShowLoginPrompt(true);
    } else {
      showEnvironmentDialog();
    }
  };

  return (
    <>
      {/* Preview badge — sits below the header bar (h-14 = 56px on code, h-12 = 48px on chat)
          Using top-[60px] to clear both. pointer-events-none so it doesn't block the header. */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="pointer-events-none absolute inset-x-0 top-[60px] z-50 flex justify-center"
      >
        <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/90 px-3 py-1 shadow-md backdrop-blur-md">
          <Eye className="size-3 text-primary" />
          <span className="text-[11px] font-medium text-muted-foreground">
            Preview Mode
          </span>
        </div>
      </motion.div>

      {/* Bottom CTA — uses a short gradient fade into a solid bg section
          so the CTA never overlaps with readable content. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="absolute inset-x-0 bottom-0 z-40"
      >
        {/* Gradient fade from transparent → solid */}
        <div
          className="h-16 sm:h-20"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 100%)',
          }}
        />

        {/* Solid background section with CTA content */}
        <div className="bg-background px-4 pb-5 pt-1 sm:pb-8 sm:pt-2">
          <div className="mx-auto flex max-w-md flex-col items-center gap-2.5 sm:gap-3">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="text-center"
            >
              <h3 className="text-base font-semibold tracking-tight sm:text-xl">
                Ready to build with Claude?
              </h3>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground sm:mt-1 sm:text-sm">
                Get instant access with your own cloud environment.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Button
                onClick={handleCTAClick}
                size="lg"
                className="group relative h-10 overflow-hidden bg-gradient-to-r from-primary to-primary/80 px-6 text-sm font-semibold shadow-lg transition-all hover:shadow-xl hover:shadow-primary/20 sm:h-11 sm:px-8 sm:text-base"
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 -left-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    left: ['100%', '-100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: 'linear',
                  }}
                />
                <Sparkles className="mr-1.5 size-4 sm:mr-2 sm:size-5" />
                Start Building with Claude
              </Button>
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground sm:gap-x-4 sm:text-xs"
            >
              <div className="flex items-center gap-1">
                <div className="size-1 rounded-full bg-emerald-500" />
                <span>Instant setup</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-1 rounded-full bg-emerald-500" />
                <span>Cloud environment</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="size-1 rounded-full bg-emerald-500" />
                <span>Full workspace access</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Click shield — blocks interaction with the workspace content.
          z-30 so it sits below the CTA (z-40), keeping the button clickable. */}
      <div className="absolute inset-0 z-30" />

      {/* Login prompt dialog */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Sign in to start building with Claude Code"
      />
    </>
  );
}
