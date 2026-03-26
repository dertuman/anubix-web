'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Constants ────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // check activity every 60s
const WARNING_SECONDS = 120;     // 2-minute countdown before suspend
const STORAGE_KEY = 'anubix-idle-timeout';
const DEFAULT_TIMEOUT = 900;     // 15 minutes

/** Available idle timeout options in seconds. 0 = never. */
export const IDLE_TIMEOUT_OPTIONS = [
  { value: 300, label: '5 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 0, label: 'Never' },
] as const;

// ── Hook ─────────────────────────────────────────────────────

interface UseAutoSuspendOptions {
  /** Bridge URL (e.g. https://app.fly.dev) */
  bridgeUrl: string | null;
  /** Bridge API key for auth */
  bridgeApiKey: string | null;
  /** Whether the machine is running and connected */
  isActive: boolean;
  /** Called to stop the machine */
  onStop: () => Promise<void>;
  /** When true, any session is actively busy — skip idle checks */
  isBusy?: boolean;
}

export interface UseAutoSuspendReturn {
  /** Whether the idle warning is currently showing */
  showWarning: boolean;
  /** Seconds remaining before auto-suspend */
  countdown: number;
  /** Dismiss warning and reset idle tracking */
  keepAlive: () => void;
  /** Stop the machine immediately */
  suspendNow: () => void;
  /** Current idle timeout setting in seconds (0 = never) */
  idleTimeout: number;
  /** Update the idle timeout setting */
  setIdleTimeout: (_seconds: number) => void;
}

function getStoredTimeout(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMEOUT;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return DEFAULT_TIMEOUT;
  const val = parseInt(stored, 10);
  return isNaN(val) ? DEFAULT_TIMEOUT : val;
}

export function useAutoSuspend({
  bridgeUrl,
  bridgeApiKey,
  isActive,
  onStop,
  isBusy = false,
}: UseAutoSuspendOptions): UseAutoSuspendReturn {
  const [idleTimeout, setIdleTimeoutState] = useState(DEFAULT_TIMEOUT);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_SECONDS);

  // Refs to avoid stale closures in intervals
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;
  const stoppingRef = useRef(false);

  // Load stored preference on mount
  useEffect(() => {
    setIdleTimeoutState(getStoredTimeout());
  }, []);

  const setIdleTimeout = useCallback((seconds: number) => {
    setIdleTimeoutState(seconds);
    localStorage.setItem(STORAGE_KEY, String(seconds));
    // Reset warning when user changes timeout
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
  }, []);

  // ── Auto-dismiss warning if sessions become busy ──────────
  useEffect(() => {
    if (isBusy && showWarning) {
      setShowWarning(false);
      setCountdown(WARNING_SECONDS);
    }
  }, [isBusy, showWarning]);

  // ── Poll bridge activity ──────────────────────────────────
  useEffect(() => {
    // Don't poll if disabled, not active, busy, or already warning
    if (!isActive || !bridgeUrl || !bridgeApiKey || idleTimeout === 0 || showWarning || isBusy) return;

    const checkActivity = async () => {
      try {
        const res = await fetch(`${bridgeUrl}/_bridge/activity`, {
          headers: { 'x-api-key': bridgeApiKey },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const idle = data.idleSeconds as number;
        if (idle >= 0 && idle >= idleTimeout) {
          setShowWarning(true);
          setCountdown(WARNING_SECONDS);
        }
      } catch {
        // Bridge unreachable — don't trigger suspend on network errors
      }
    };

    // Check immediately, then poll
    checkActivity();
    const interval = setInterval(checkActivity, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isActive, bridgeUrl, bridgeApiKey, idleTimeout, showWarning, isBusy]);

  // ── Warning countdown ─────────────────────────────────────
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time's up — stop the machine
          if (!stoppingRef.current) {
            stoppingRef.current = true;
            onStopRef.current().finally(() => {
              stoppingRef.current = false;
            });
          }
          setShowWarning(false);
          return WARNING_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning]);

  // ── Reset if machine becomes inactive ─────────────────────
  useEffect(() => {
    if (!isActive) {
      setShowWarning(false);
      setCountdown(WARNING_SECONDS);
    }
  }, [isActive]);

  const keepAlive = useCallback(() => {
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
    // Touch the bridge to reset server-side lastActiveAt
    if (bridgeUrl && bridgeApiKey) {
      fetch(`${bridgeUrl}/_bridge/health`, {
        headers: { 'x-api-key': bridgeApiKey },
      }).catch(() => {});
    }
  }, [bridgeUrl, bridgeApiKey]);

  const suspendNow = useCallback(() => {
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
    if (!stoppingRef.current) {
      stoppingRef.current = true;
      onStopRef.current().finally(() => {
        stoppingRef.current = false;
      });
    }
  }, []);

  return {
    showWarning,
    countdown,
    keepAlive,
    suspendNow,
    idleTimeout,
    setIdleTimeout,
  };
}
