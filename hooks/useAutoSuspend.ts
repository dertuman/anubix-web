'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Constants ────────────────────────────────────────────────

const ACTIVITY_THROTTLE_MS = 5_000;
const WARNING_SECONDS = 120; // 2-minute countdown before suspend
const STORAGE_KEY = 'anubix-idle-timeout';
const DEFAULT_TIMEOUT = 900; // 15 minutes

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
  bridgeUrl?: string | null;
  bridgeApiKey?: string | null;
  isActive: boolean;
  onStop: () => Promise<void>;
  isBusy?: boolean;
}

export interface UseAutoSuspendReturn {
  showWarning: boolean;
  countdown: number;
  keepAlive: () => void;
  suspendNow: () => void;
  idleTimeout: number;
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

  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;
  const stoppingRef = useRef(false);
  const throttleRef = useRef(0);

  // Timers
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suspendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load stored preference on mount
  useEffect(() => {
    setIdleTimeoutState(getStoredTimeout());
  }, []);

  const setIdleTimeout = useCallback((seconds: number) => {
    setIdleTimeoutState(seconds);
    localStorage.setItem(STORAGE_KEY, String(seconds));
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
  }, []);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
    if (suspendTimerRef.current) { clearTimeout(suspendTimerRef.current); suspendTimerRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
  }, []);

  const doStop = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    clearAllTimers();
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
    onStopRef.current().finally(() => { stoppingRef.current = false; });
  }, [clearAllTimers]);

  // ── Core: schedule warning → then suspend ─────────────────
  // Single setTimeout for warning, single setTimeout for suspend.
  // Every activity resets both. Works in background tabs because
  // setTimeout is guaranteed to fire (even if delayed by throttling).
  const scheduleTimers = useCallback(() => {
    clearAllTimers();
    if (idleTimeout === 0) return;

    // Timer 1: show warning after idle timeout
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      setShowWarning(true);
      setCountdown(WARNING_SECONDS);

      // Start countdown display (best-effort in background tabs)
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      // Timer 2: hard suspend after warning period
      // This fires even in background tabs — no reliance on countdown interval
      suspendTimerRef.current = setTimeout(() => {
        suspendTimerRef.current = null;
        doStop();
      }, WARNING_SECONDS * 1000);

    }, idleTimeout * 1000);
  }, [idleTimeout, clearAllTimers, doStop]);

  // ── Track user activity ──────────────────────────────────
  useEffect(() => {
    if (!isActive || idleTimeout === 0) return;

    const resetActivity = () => {
      if (stoppingRef.current) return;
      setShowWarning(false);
      setCountdown(WARNING_SECONDS);
      scheduleTimers();
    };

    const throttledReset = () => {
      const now = Date.now();
      if (now - throttleRef.current >= ACTIVITY_THROTTLE_MS) {
        throttleRef.current = now;
        resetActivity();
      }
    };

    // Start timers
    scheduleTimers();

    window.addEventListener('mousedown', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('scroll', resetActivity, { passive: true });
    window.addEventListener('touchstart', resetActivity, { passive: true });
    window.addEventListener('mousemove', throttledReset, { passive: true });

    return () => {
      clearAllTimers();
      window.removeEventListener('mousedown', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      window.removeEventListener('mousemove', throttledReset);
    };
  }, [isActive, idleTimeout, scheduleTimers, clearAllTimers]);

  // ── Pause timers while busy, resume when idle ─────────────
  useEffect(() => {
    if (isBusy) {
      clearAllTimers();
      setShowWarning(false);
      setCountdown(WARNING_SECONDS);
    } else if (isActive && idleTimeout > 0) {
      scheduleTimers();
    }
  }, [isBusy, isActive, idleTimeout, clearAllTimers, scheduleTimers]);

  // ── Reset if machine becomes inactive ─────────────────────
  useEffect(() => {
    if (!isActive) {
      clearAllTimers();
      setShowWarning(false);
      setCountdown(WARNING_SECONDS);
    }
  }, [isActive, clearAllTimers]);

  const keepAlive = useCallback(() => {
    setShowWarning(false);
    setCountdown(WARNING_SECONDS);
    scheduleTimers();
    if (bridgeUrl && bridgeApiKey) {
      fetch(`${bridgeUrl}/_bridge/health`, {
        headers: { 'x-api-key': bridgeApiKey },
      }).catch(() => {});
    }
  }, [bridgeUrl, bridgeApiKey, scheduleTimers]);

  const suspendNow = useCallback(() => {
    doStop();
  }, [doStop]);

  return {
    showWarning,
    countdown,
    keepAlive,
    suspendNow,
    idleTimeout,
    setIdleTimeout,
  };
}
