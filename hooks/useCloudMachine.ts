'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

// ── Types ────────────────────────────────────────────────────

export type MachineStatus =
  | 'provisioning'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'destroying'
  | 'destroyed'
  | 'error';

export interface CloudMachine {
  status: MachineStatus;
  bridgeUrl: string | null;
  bridgeApiKey: string | null;
  previewUrl: string | null;
  region: string;
  claudeMode: 'cli' | 'sdk';
  templateName: string | null;
  gitRepoUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  stoppedAt: string | null;
  lastHealthCheckAt: string | null;
}

export interface ProvisionOptions {
  claudeMode: 'cli' | 'sdk';
  claudeAuthJson?: string;
  anthropicApiKey?: string;
  templateName?: string;
  gitRepoUrl?: string;
  region?: string;
}

export interface UseCloudMachineReturn {
  /** Current machine state, or null if no machine exists */
  machine: CloudMachine | null;
  /** True while the initial status fetch is loading */
  isLoading: boolean;
  /** True during provision/start/stop/destroy operations */
  isWorking: boolean;
  /** Error message from the last operation */
  error: string | null;
  /** Create a new cloud machine */
  provision: (opts: ProvisionOptions) => Promise<void>;
  /** Resume a stopped machine */
  start: () => Promise<void>;
  /** Pause the machine (preserves volume) */
  stop: () => Promise<void>;
  /** Fully destroy all resources */
  destroy: () => Promise<void>;
  /** Re-fetch machine status */
  refresh: () => Promise<void>;
}

// ── Hook ─────────────────────────────────────────────────────

export function useCloudMachine(): UseCloudMachineReturn {
  const { isSignedIn } = useAuth();
  const [machine, setMachine] = useState<CloudMachine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch status ─────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/cloud/status');
      if (!res.ok) return;
      const data = await res.json();
      setMachine(data.machine ?? null);
      return data.machine as CloudMachine | null;
    } catch {
      return null;
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }
    fetchStatus().finally(() => setIsLoading(false));
  }, [isSignedIn, fetchStatus]);

  // ── Poll during transitional states ──────────────────────
  useEffect(() => {
    const shouldPoll =
      machine?.status === 'provisioning' ||
      machine?.status === 'starting' ||
      machine?.status === 'stopping' ||
      machine?.status === 'destroying';

    if (shouldPoll && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const m = await fetchStatus();
        // Stop polling once we reach a terminal state
        if (m && m.status !== 'provisioning' && m.status !== 'starting' && m.status !== 'stopping' && m.status !== 'destroying') {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setIsWorking(false);
        }
      }, 2000);
    }

    if (!shouldPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [machine?.status, fetchStatus]);

  // ── Provision ────────────────────────────────────────────
  const provision = useCallback(async (opts: ProvisionOptions) => {
    setIsWorking(true);
    setError(null);

    try {
      const res = await fetch('/api/cloud/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Provisioning failed');
      }

      // If the server returned running immediately (existing machine)
      if (data.status === 'running') {
        setMachine({
          status: 'running',
          bridgeUrl: data.bridgeUrl,
          bridgeApiKey: data.bridgeApiKey,
          previewUrl: data.previewUrl,
          region: opts.region || 'lhr',
          claudeMode: opts.claudeMode,
          templateName: opts.templateName || null,
          gitRepoUrl: opts.gitRepoUrl || null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
          stoppedAt: null,
          lastHealthCheckAt: new Date().toISOString(),
        });
        setIsWorking(false);
      } else {
        // Fetch latest status — polling will take over
        await fetchStatus();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Provisioning failed';
      setError(msg);
      setIsWorking(false);
      // Refresh to get the actual DB state
      await fetchStatus();
    }
  }, [fetchStatus]);

  // ── Start ────────────────────────────────────────────────
  const start = useCallback(async () => {
    setIsWorking(true);
    setError(null);

    try {
      const res = await fetch('/api/cloud/start', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to start');

      if (data.status === 'running') {
        setMachine((prev) => prev ? {
          ...prev,
          status: 'running',
          bridgeUrl: data.bridgeUrl,
          bridgeApiKey: data.bridgeApiKey,
          previewUrl: data.previewUrl,
          stoppedAt: null,
          errorMessage: null,
        } : null);
        setIsWorking(false);
      } else {
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setIsWorking(false);
      await fetchStatus();
    }
  }, [fetchStatus]);

  // ── Stop ─────────────────────────────────────────────────
  const stop = useCallback(async () => {
    setIsWorking(true);
    setError(null);

    try {
      const res = await fetch('/api/cloud/stop', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to stop');

      setMachine((prev) => prev ? {
        ...prev,
        status: 'stopped',
        stoppedAt: new Date().toISOString(),
      } : null);
      setIsWorking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop');
      setIsWorking(false);
      await fetchStatus();
    }
  }, [fetchStatus]);

  // ── Destroy ──────────────────────────────────────────────
  const destroy = useCallback(async () => {
    setIsWorking(true);
    setError(null);

    try {
      const res = await fetch('/api/cloud/destroy', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to destroy');

      setMachine(null);
      setIsWorking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to destroy');
      setIsWorking(false);
      await fetchStatus();
    }
  }, [fetchStatus]);

  // ── Refresh ──────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return {
    machine,
    isLoading,
    isWorking,
    error,
    provision,
    start,
    stop,
    destroy,
    refresh,
  };
}
