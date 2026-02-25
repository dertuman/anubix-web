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
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[useGitHubConnection] Failed to fetch status:', res.status, error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const data = await res.json();
      setState({
        isConnected: data.connected ?? false,
        username: data.username ?? null,
        isLoading: false,
      });
    } catch (err) {
      console.error('[useGitHubConnection] Exception while fetching status:', err);
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
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[useGitHubConnection] Failed to disconnect:', res.status, error);
        throw new Error(error.error || 'Failed to disconnect');
      }
    } catch (err) {
      console.error('[useGitHubConnection] Exception while disconnecting:', err);
      throw err;
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    refresh: fetchStatus,
  };
}
