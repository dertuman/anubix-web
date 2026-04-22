'use client';

import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { ChevronLeft, Cloud, Laptop, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { BridgeSetup } from '../../code/components/bridge-setup';
import { CloudProvision } from '../../code/components/cloud-provision';
import { LocalBridgeSetup } from '../../code/components/local-bridge-setup';

type Mode = 'picker' | 'cloud' | 'local' | 'manual';

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
  const [mode, setMode] = useState<Mode>('picker');

  // Reset to picker each time the dialog opens
  useEffect(() => {
    if (isOpen) setMode('picker');
  }, [isOpen]);

  // Close dialog when connection succeeds
  useEffect(() => {
    if (connectionStatus === 'connected') onClose();
  }, [connectionStatus, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogTitle className="sr-only">Environment Setup</DialogTitle>

        {!isSignedIn ? (
          <LoginGate onClose={onClose} />
        ) : connectionError ? (
          <ErrorPanel message={connectionError} />
        ) : mode === 'picker' ? (
          <EnvironmentPicker onPick={setMode} />
        ) : mode === 'cloud' ? (
          <WithBack onBack={() => setMode('picker')}>
            <DialogHeader className="sr-only">
              <DialogTitle>Cloud Environment Setup</DialogTitle>
            </DialogHeader>
            <CloudProvision
              onConnected={onConnected}
              onManualSetup={() => setMode('manual')}
            />
          </WithBack>
        ) : mode === 'local' ? (
          <WithBack onBack={() => setMode('picker')}>
            <DialogHeader className="sr-only">
              <DialogTitle>Connect My Computer</DialogTitle>
            </DialogHeader>
            <LocalBridgeSetup onConnected={onConnected} />
          </WithBack>
        ) : (
          <WithBack onBack={() => setMode('cloud')}>
            <div className="p-6">
              <DialogHeader>
                <DialogTitle>Manual Bridge Setup</DialogTitle>
              </DialogHeader>
              <BridgeSetup
                onConnect={onConnected}
                isConnecting={false}
                error={connectionError ?? null}
              />
            </div>
          </WithBack>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────

function EnvironmentPicker({ onPick }: { onPick: (_mode: Mode) => void }) {
  return (
    <div className="space-y-6 p-8">
      <DialogHeader>
        <DialogTitle className="text-center text-xl">Pick an environment</DialogTitle>
        <p className="text-muted-foreground text-center text-sm">
          Where should Claude run?
        </p>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <PickerCard
          icon={<Cloud className="size-8" />}
          title="Run in the cloud"
          description="Anubix provisions a machine on Fly.io. Works from anywhere, needs a subscription."
          onClick={() => onPick('cloud')}
        />
        <PickerCard
          icon={<Laptop className="size-8" />}
          title="Connect my computer"
          description="Bridge runs locally. Free, full access to your files. Your laptop must be on."
          onClick={() => onPick('local')}
        />
      </div>
    </div>
  );
}

function PickerCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="border-border hover:border-primary/50 hover:bg-muted/40 flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors"
    >
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-muted-foreground mt-1 text-sm">{description}</div>
      </div>
    </button>
  );
}

function WithBack({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground absolute top-3 left-3 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>
      {children}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <DialogHeader className="sr-only">
        <DialogTitle>Connection Error</DialogTitle>
      </DialogHeader>
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-2xl">
        <Cloud className="text-destructive size-8" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Connection Failed</h3>
        <p className="text-destructive text-sm">{message}</p>
      </div>
    </div>
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
