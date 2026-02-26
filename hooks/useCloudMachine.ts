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
  /** Machine-readable error code (e.g. 'SUBSCRIPTION_REQUIRED') */
  errorCode: string | null;
  /** Create a new cloud machine */
  provision: (_opts: ProvisionOptions) => Promise<void>;
  /** Resume a stopped machine */
  start: () => Promise<void>;
  /** Pause the machine (preserves volume) */
  stop: () => Promise<void>;
  /** Fully destroy all resources */
  destroy: () => Promise<void>;
  /** Re-fetch machine status */
  refresh: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON response:', err);
    return { error: text || `Request failed (${res.status})` };
  }
}

// ── Hook ─────────────────────────────────────────────────────

export function useCloudMachine(): UseCloudMachineReturn {
  const { isSignedIn } = useAuth();
  const [machine, setMachine] = useState<CloudMachine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch status ─────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/cloud/status');
      if (!res.ok) return;
      const data = await safeJson(res);
      setMachine(data.machine ?? null);
      return data.machine as CloudMachine | null;
    } catch (err) {
      console.error('Failed to fetch cloud machine status:', err);
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
        if (
          m &&
          m.status !== 'provisioning' &&
          m.status !== 'starting' &&
          m.status !== 'stopping' &&
          m.status !== 'destroying'
        ) {
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
  const provision = useCallback(
    async (opts: ProvisionOptions) => {
      setIsWorking(true);
      setError(null);
      setErrorCode(null);

      // The provision API takes 1-5 minutes (Fly.io setup). We don't want
      // to block the UI that whole time. Strategy:
      //   1. Fire the request
      //   2. Race it against a 3-second timeout
      //   3. If it responds quickly (error, or already-running) → handle immediately
      //   4. If it times out → the DB row exists, polling picks up progress

      const fetchPromise = fetch('/api/cloud/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }).then(async (res) => ({
        res,
        data: await safeJson(res),
      }));

      type QuickResult = { res: Response; data: Record<string, unknown> };
      const quickResult = await Promise.race<QuickResult | null>([
        fetchPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (quickResult) {
        // Request completed within 3 seconds (fast error or existing machine)
        const { res, data } = quickResult;

        if (!res.ok) {
          if (data.code) setErrorCode(data.code as string);
          setError((data.error as string) || 'Provisioning failed');
          setIsWorking(false);
          await fetchStatus();
          return;
        }

        if (data.status === 'running') {
          setMachine({
            status: 'running',
            bridgeUrl: data.bridgeUrl as string,
            bridgeApiKey: data.bridgeApiKey as string,
            previewUrl: (data.previewUrl as string) || null,
            region: opts.region || 'lhr',
            claudeMode: 'cli',
            templateName: opts.templateName || null,
            gitRepoUrl: opts.gitRepoUrl || null,
            errorMessage: null,
            createdAt: new Date().toISOString(),
            stoppedAt: null,
            lastHealthCheckAt: new Date().toISOString(),
          });
          setIsWorking(false);
          return;
        }

        // Some other quick status — fetch and let polling handle it
        await fetchStatus();
        return;
      }

      // Timed out — provisioning is in progress on the server.
      // The DB row should exist by now. Fetch status so polling starts.
      await fetchStatus();

      // Handle the eventual response in the background
      fetchPromise
        .then(async ({ res, data }) => {
          if (!res.ok) {
            if (data.code) setErrorCode(data.code as string);
            setError((data.error as string) || 'Provisioning failed');
            setIsWorking(false);
          }
          // Whether success or failure, reconcile with DB state
          await fetchStatus();
        })
        .catch(async () => {
          await fetchStatus();
        });
    },
    [fetchStatus]
  );

  // ── Start ────────────────────────────────────────────────
  const start = useCallback(async () => {
    setIsWorking(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch('/api/cloud/start', { method: 'POST' });
      const data = await safeJson(res);

      if (!res.ok) {
        if (data.code) setErrorCode(data.code);
        throw new Error(data.error || 'Failed to start');
      }

      if (data.status === 'running') {
        setMachine((prev) =>
          prev
            ? {
                ...prev,
                status: 'running',
                bridgeUrl: data.bridgeUrl,
                bridgeApiKey: data.bridgeApiKey,
                previewUrl: data.previewUrl,
                stoppedAt: null,
                errorMessage: null,
              }
            : null
        );
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
      const data = await safeJson(res);

      if (!res.ok) throw new Error(data.error || 'Failed to stop');

      setMachine((prev) =>
        prev
          ? {
              ...prev,
              status: 'stopped',
              stoppedAt: new Date().toISOString(),
            }
          : null
      );
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
      const data = await safeJson(res);

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
    errorCode,
    provision,
    start,
    stop,
    destroy,
    refresh,
  };
}
