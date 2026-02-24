'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2, Cloud } from 'lucide-react';
import { useClaudeCode } from '@/hooks/useClaudeCode';
import { useCloudMachine } from '@/hooks/useCloudMachine';
import { Button } from '@/components/ui/button';
import { CodeView } from '../../code/components/code-view';
import { ModeToggle } from './mode-toggle';

/**
 * Wrapper for CodeView in workspace context
 * Handles connection automatically without blocking the UI
 */
export function CodeViewWrapper() {
  const { isSignedIn } = useAuth();
  const { status, connect } = useClaudeCode();
  const cloudMachine = useCloudMachine();
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Auto-connect when machine is running
  useEffect(() => {
    if (
      isSignedIn &&
      status === 'disconnected' &&
      cloudMachine.machine?.status === 'running' &&
      cloudMachine.machine.bridgeUrl &&
      cloudMachine.machine.bridgeApiKey
    ) {
      connect(cloudMachine.machine.bridgeUrl, cloudMachine.machine.bridgeApiKey);
    }
  }, [isSignedIn, status, cloudMachine.machine, connect]);

  // Handle cloud provisioning
  const handleProvision = useCallback(async () => {
    if (!isSignedIn) return;
    setIsProvisioning(true);
    try {
      await cloudMachine.provision({
        gitRepoUrl: 'https://github.com/dertuman/talkartech-fullstack-template-supabase.git',
      });
    } catch (error) {
      console.error('Provision error:', error);
    } finally {
      setIsProvisioning(false);
    }
  }, [isSignedIn, cloudMachine]);

  // For unauthenticated users - show blank slate
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

  // For authenticated users without connection - show minimal setup prompt
  if (status === 'disconnected' && !cloudMachine.machine) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Cloud className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Launch Environment</h2>
            <p className="text-sm text-muted-foreground">
              Start a cloud development environment to begin coding with Claude.
            </p>
          </div>
          <Button
            onClick={handleProvision}
            disabled={isProvisioning || cloudMachine.isLoading}
            className="gap-2"
            size="lg"
          >
            {isProvisioning || cloudMachine.isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Cloud className="size-4" />
                Launch Environment
              </>
            )}
          </Button>
          {cloudMachine.error && (
            <p className="text-sm text-destructive">{cloudMachine.error}</p>
          )}
        </div>
      </div>
    );
  }

  // Show full CodeView with mode toggle (handles all connected states)
  return <CodeView modeToggle={<ModeToggle variant="sidebar" />} />;
}
