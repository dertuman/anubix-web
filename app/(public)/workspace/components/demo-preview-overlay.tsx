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
      {/* Preview badge at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute left-1/2 top-4 z-50 -translate-x-1/2"
      >
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-1.5 shadow-lg backdrop-blur-md">
          <Eye className="size-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Preview Mode
          </span>
        </div>
      </motion.div>

      {/* Bottom gradient overlay with CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="absolute inset-x-0 bottom-0 z-40 flex items-end justify-center pb-8 pt-32"
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 40%, hsl(var(--background) / 0.8) 60%, transparent 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-4 px-4">
          {/* Main CTA */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            <h3 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
              Ready to build with Claude?
            </h3>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Get instant access to Claude Code with your own cloud environment.
              Start coding in seconds.
            </p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Button
              onClick={handleCTAClick}
              size="lg"
              className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 px-8 text-base font-semibold shadow-xl transition-all hover:shadow-2xl hover:shadow-primary/20"
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
              <Sparkles className="mr-2 size-5" />
              Start Building with Claude
            </Button>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <div className="size-1 rounded-full bg-emerald-500" />
              <span>Instant setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1 rounded-full bg-emerald-500" />
              <span>Cloud environment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1 rounded-full bg-emerald-500" />
              <span>Full workspace access</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Click shield - prevents interaction with workspace */}
      <div className="absolute inset-0 z-30 cursor-not-allowed" />

      {/* Login prompt dialog */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Sign in to start building with Claude Code"
      />
    </>
  );
}
