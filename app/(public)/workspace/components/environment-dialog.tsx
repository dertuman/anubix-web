'use client';

import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { Cloud, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { BridgeSetup } from '../../code/components/bridge-setup';
import { CloudProvision } from '../../code/components/cloud-provision';

interface EnvironmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (_bridgeUrl: string, _bridgeApiKey: string) => void;
  connectionStatus?: 'disconnected' | 'connected';
  connectionError?: string | null;
}

export function EnvironmentDialog({
  isOpen,
  onClose,
  onConnected,
  connectionStatus = 'disconnected',
  connectionError,
}: EnvironmentDialogProps) {
  const { isSignedIn } = useAuth();
  const [showManualSetup, setShowManualSetup] = useState(false);

  // Close dialog when connection succeeds
  useEffect(() => {
    if (connectionStatus === 'connected') {
      onClose();
    }
  }, [connectionStatus, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogTitle className="sr-only">Environment Setup</DialogTitle>
        {!isSignedIn ? (
          <LoginGate onClose={onClose} />
        ) : connectionError ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
            <DialogHeader className="sr-only">
              <DialogTitle>Connection Error</DialogTitle>
            </DialogHeader>
            <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-2xl">
              <Cloud className="text-destructive size-8" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Connection Failed</h3>
              <p className="text-destructive text-sm">{connectionError}</p>
            </div>
          </div>
        ) : showManualSetup ? (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Manual Bridge Setup</DialogTitle>
            </DialogHeader>
            <BridgeSetup
              onConnect={onConnected}
              isConnecting={false}
              error={connectionError ?? null}
            />
            <button
              onClick={() => setShowManualSetup(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground mt-4 rounded-md px-2 py-1 text-sm transition-colors"
            >
              ← Back to cloud setup
            </button>
          </div>
        ) : (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Cloud Environment Setup</DialogTitle>
            </DialogHeader>
            <CloudProvision
              onConnected={onConnected}
              onManualSetup={() => setShowManualSetup(true)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LoginGate({ onClose }: { onClose: () => void }) {
  const clerk = useClerk();

  const handleSignIn = () => {
    onClose();
    clerk.openSignIn({ forceRedirectUrl: '/workspace', signUpForceRedirectUrl: '/workspace' });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="bg-primary/10 flex size-16 items-center justify-center rounded-2xl">
        <LogIn className="text-primary size-8" />
      </div>
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold">Sign in to continue</h3>
        <p className="text-muted-foreground text-sm">
          Sign in to create and manage cloud environments
        </p>
      </div>
      <Button
        onClick={handleSignIn}
        className="w-full max-w-xs gap-2"
        size="lg"
      >
        <LogIn className="size-4" />
        Sign in
      </Button>
    </div>
  );
}
