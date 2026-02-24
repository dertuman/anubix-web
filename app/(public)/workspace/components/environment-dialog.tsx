'use client';

import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
        {connectionError ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
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
              className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to cloud setup
            </button>
          </div>
        ) : (
          <CloudProvision
            onConnected={onConnected}
            onManualSetup={() => setShowManualSetup(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
