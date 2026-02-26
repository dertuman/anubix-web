'use client';

import { useCallback, useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON response:', err);
    return { error: text || `Request failed (${res.status})` };
  }
}

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
    } catch (err) {
      console.error('Failed to fetch Claude connection status:', err);
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
      const data = await safeJsonResponse(res);
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
    const data = await safeJsonResponse(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to start OAuth');
    }
    return data.authorizeUrl;
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
      const data = await safeJsonResponse(res);
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
    } catch (err) {
      console.error('Failed to disconnect Claude:', err);
    }
  }, []);

  /**
   * Push the latest Claude credentials from the database to the running machine.
   * Call this after re-authenticating so the bridge picks up the new tokens.
   */
  const pushToMachine = useCallback(async () => {
    const res = await fetch('/api/cloud/credentials/push', { method: 'POST' });
    const data = await safeJsonResponse(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to push credentials to machine');
    }
    return data;
  }, []);

  return {
    ...state,
    startOAuth,
    exchangeCode,
    save,
    disconnect,
    pushToMachine,
    refresh: fetchStatus,
  };
}
