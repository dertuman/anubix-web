'use client';

import { useCallback, useEffect, useState } from 'react';

interface ClaudeConnectionState {
  isConnected: boolean;
  mode: 'cli' | 'sdk' | null;
  isLoading: boolean;
}

export function useClaudeConnection() {
  const [state, setState] = useState<ClaudeConnectionState>({
    isConnected: false,
    mode: null,
    isLoading: true,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/claude/status');
      if (!res.ok) return;
      const data = await res.json();
      setState({
        isConnected: data.connected ?? false,
        mode: data.mode ?? null,
        isLoading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const save = useCallback(async (opts: {
    claudeMode: 'cli' | 'sdk';
    claudeAuthJson?: string;
    anthropicApiKey?: string;
  }) => {
    const res = await fetch('/api/auth/claude/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save');
    }
    setState({
      isConnected: true,
      mode: opts.claudeMode,
      isLoading: false,
    });
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/claude/disconnect', { method: 'POST' });
      if (res.ok) {
        setState({ isConnected: false, mode: null, isLoading: false });
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    ...state,
    save,
    disconnect,
    refresh: fetchStatus,
  };
}
