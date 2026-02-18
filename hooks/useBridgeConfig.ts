'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface BridgeConfigData {
  bridgeUrl: string;
  apiKey: string;
}

export function useBridgeConfig() {
  const { isSignedIn } = useAuth();
  const [config, setConfig] = useState<BridgeConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setIsLoading(false); return; }

    fetch('/api/bridge-config')
      .then((r) => r.json())
      .then((data) => setConfig(data.config ?? null))
      .catch(() => setConfig(null))
      .finally(() => setIsLoading(false));
  }, [isSignedIn]);

  const saveConfig = useCallback(async (bridgeUrl: string, apiKey: string) => {
    await fetch('/api/bridge-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridgeUrl, apiKey }),
    });
    setConfig({ bridgeUrl, apiKey });
  }, []);

  const deleteConfig = useCallback(async () => {
    await fetch('/api/bridge-config', { method: 'DELETE' });
    setConfig(null);
  }, []);

  return { config, isLoading, saveConfig, deleteConfig };
}
