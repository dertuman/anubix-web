'use client';

import React, { useEffect, useState } from 'react';

export function ElapsedTimer({ startTs, stopped, durationMs }: { startTs: number; stopped?: boolean; durationMs?: number }) {
  const persistedSecs = durationMs != null ? Math.floor(durationMs / 1000) : null;

  const [elapsed, setElapsed] = useState(() =>
    persistedSecs ?? Math.floor((Date.now() - startTs) / 1000),
  );
  const frozenRef = React.useRef<number | null>(persistedSecs);

  useEffect(() => {
    if (stopped && frozenRef.current === null) {
      frozenRef.current = Math.floor((Date.now() - startTs) / 1000);
      setElapsed(frozenRef.current);
    }
  }, [stopped, startTs]);

  useEffect(() => {
    if (stopped || persistedSecs != null) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTs) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTs, stopped, persistedSecs]);

  const displayElapsed = frozenRef.current ?? elapsed;
  if (displayElapsed > 3600) return null;

  const mins = Math.floor(displayElapsed / 60);
  const secs = displayElapsed % 60;
  return <span className="tabular-nums text-xs text-muted-foreground">{mins > 0 ? `${mins}m ` : ''}{secs}s</span>;
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.getDate() !== now.getDate() || date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }
  return time;
}
