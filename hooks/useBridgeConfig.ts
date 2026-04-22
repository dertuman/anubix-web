'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface BridgeConfigData {
  /** Public tunnel URL. Null until the bridge has self-registered. */
  bridgeUrl: string | null;
  /** Decrypted bridge API key. Empty string if none set. */
  apiKey: string;
  /** Last time the bridge checked in. Null = has never been online. */
  lastSeenAt: string | null;
  /** True if a generate() has produced an install token for this user. */
  hasInstallToken: boolean;
}

export interface GenerateResult {
  installToken: string;
  bridgeApiKey: string;
  envTemplate: string;
}

export function useBridgeConfig() {
  const { isSignedIn } = useAuth();
  const [config, setConfig] = useState<BridgeConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      // no-store: we poll this specifically to detect lastSeenAt changes; a
      // cached response here would make the sidebar lie.
      const res = await fetch('/api/bridge-config', { cache: 'no-store' });
      if (!res.ok) { setConfig(null); return; }
      const data = await res.json();
      setConfig(data.config ?? null);
    } catch {
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) { setIsLoading(false); return; }
    refresh().finally(() => setIsLoading(false));
  }, [isSignedIn, refresh]);

  /** Poll every 3s while the bridge hasn't self-registered yet, so the UI
   *  flips to "connected" as soon as the user's laptop comes online. */
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(refresh, 3000);
  }, [refresh]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const generate = useCallback(async (): Promise<GenerateResult> => {
    const res = await fetch('/api/bridge-config/generate', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to generate');
    }
    const data = await res.json();
    await refresh();
    return data as GenerateResult;
  }, [refresh]);

  const deleteConfig = useCallback(async () => {
    await fetch('/api/bridge-config', { method: 'DELETE' });
    setConfig(null);
  }, []);

  return {
    config,
    isLoading,
    refresh,
    generate,
    deleteConfig,
    startPolling,
    stopPolling,
  };
}
