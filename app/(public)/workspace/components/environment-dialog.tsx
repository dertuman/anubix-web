'use client';

import { useState, useEffect } from 'react';
import { useAuth, useSignIn } from '@clerk/nextjs';
import { Cloud, LogIn, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CloudProvision } from '../../code/components/cloud-provision';
import { BridgeSetup } from '../../code/components/bridge-setup';

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Environment Setup</DialogTitle>
        {!isSignedIn ? (
          <LoginGate />
        ) : connectionError ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
            <DialogHeader className="sr-only">
              <DialogTitle>Connection Error</DialogTitle>
            </DialogHeader>
            <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
              <Cloud className="size-8 text-destructive" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Connection Failed</h3>
              <p className="text-sm text-destructive">{connectionError}</p>
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
              className="mt-4 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

function LoginGate() {
  const { signIn } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/workspace',
      });
    } catch {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    window.location.href = '/sign-in?redirect_url=/workspace';
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <LogIn className="size-8 text-primary" />
      </div>
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-semibold">Sign in to continue</h3>
        <p className="text-sm text-muted-foreground">
          Sign in to create and manage cloud environments
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
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
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Continue with Google
        </Button>
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
  );
}
