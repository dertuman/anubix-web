'use client';

import { useCallback, useEffect, useState } from 'react';

interface GitHubConnectionState {
  isConnected: boolean;
  username: string | null;
  isLoading: boolean;
}

export function useGitHubConnection() {
  const [state, setState] = useState<GitHubConnectionState>({
    isConnected: false,
    username: null,
    isLoading: true,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/github/status');
      if (!res.ok) return;
      const data = await res.json();
      setState({
        isConnected: data.connected ?? false,
        username: data.username ?? null,
        isLoading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connect = useCallback((returnTo?: string) => {
    const url = returnTo
      ? `/api/auth/github?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/github';
    window.location.href = url;
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/github/disconnect', { method: 'POST' });
      if (res.ok) {
        setState({ isConnected: false, username: null, isLoading: false });
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    refresh: fetchStatus,
  };
}
