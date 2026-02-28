'use client';

import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

/**
 * Lightweight overlay for demo preview mode.
 * Shows a "Preview Mode" badge — the login prompt is triggered
 * from the workspace-view when the user tries to send a message.
 */
export function DemoPreviewOverlay() {
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
            Preview Mode — Type a message to try it out
          </span>
        </div>
      </motion.div>
    </>
  );
}
