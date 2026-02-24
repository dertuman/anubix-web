'use client';

import { CodeView } from '../../code/components/code-view';
import { useAuth } from '@clerk/nextjs';

/**
 * Wrapper for CodeView in workspace context
 * Shows blank slate instead of cloud provision screen for unauthenticated users
 */
export function CodeViewWrapper() {
  const { isSignedIn } = useAuth();

  // For unauthenticated users in workspace, don't show anything
  // The login prompt will handle interaction
  if (!isSignedIn) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-2xl font-bold text-primary">A</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Code Mode</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access the full coding environment with Claude Code integration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // For authenticated users, show full CodeView
  return <CodeView />;
}
