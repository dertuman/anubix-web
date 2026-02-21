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

  /**
   * Start the Claude OAuth flow:
   * 1. Calls backend to generate a PKCE challenge and get the authorize URL
   * 2. Opens the URL in a new tab — user authorizes on claude.ai
   * 3. Anthropic's console page displays the authorization code
   * Returns the authorize URL so the UI can open it.
   */
  const startOAuth = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/auth/claude', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to start OAuth');
    }
    const { authorizeUrl } = await res.json();
    return authorizeUrl;
  }, []);

  /**
   * Exchange the authorization code (pasted by the user) for tokens.
   * The PKCE verifier is stored in an httpOnly cookie from startOAuth().
   */
  const exchangeCode = useCallback(async (code: string) => {
    const res = await fetch('/api/auth/claude/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to exchange code');
    }
    setState({
      isConnected: true,
      mode: 'cli',
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
    startOAuth,
    exchangeCode,
    save,
    disconnect,
    refresh: fetchStatus,
  };
}
