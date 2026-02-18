'use client';

/**
 * Manages multiple SessionConnection instances (max 5 concurrent).
 * Uses LRU eviction when the limit is exceeded.
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { SessionConnection, type ConnectionHealth } from './useSessionConnection';

const MAX_CONNECTIONS = 5;

export interface PoolSessionState {
  connectionHealth: ConnectionHealth;
  isBusy: boolean;
}

export function useSessionPool() {
  const connectionsRef = useRef(new Map<string, SessionConnection>());
  const lruRef = useRef<string[]>([]);
  const baseUrlRef = useRef('');
  const apiKeyRef = useRef('');
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const setCredentials = useCallback((baseUrl: string, apiKey: string) => {
    baseUrlRef.current = baseUrl;
    apiKeyRef.current = apiKey;
  }, []);

  const connect = useCallback((sessionId: string) => {
    const map = connectionsRef.current;
    const existing = map.get(sessionId);

    if (existing) {
      lruRef.current = [sessionId, ...lruRef.current.filter((id) => id !== sessionId)];
      const h = existing.connectionHealth;
      if (h === 'disconnected' || h === 'failed') existing.retry();
      return;
    }

    while (map.size >= MAX_CONNECTIONS && lruRef.current.length > 0) {
      const evictId = lruRef.current.pop()!;
      const evicted = map.get(evictId);
      if (evicted) { evicted.destroy(); map.delete(evictId); }
    }

    const conn = new SessionConnection(sessionId, baseUrlRef.current, apiKeyRef.current, forceUpdate);
    map.set(sessionId, conn);
    lruRef.current = [sessionId, ...lruRef.current.filter((id) => id !== sessionId)];
    conn.connect();
  }, [forceUpdate]);

  const disconnect = useCallback((sessionId: string) => {
    connectionsRef.current.get(sessionId)?.disconnect();
  }, []);

  const disconnectAll = useCallback(() => {
    for (const conn of connectionsRef.current.values()) conn.destroy();
    connectionsRef.current.clear();
    lruRef.current = [];
    forceUpdate();
  }, [forceUpdate]);

  const getConnection = useCallback((sessionId: string): SessionConnection | null => {
    return connectionsRef.current.get(sessionId) ?? null;
  }, []);

  const getSessionStates = useCallback((): Map<string, PoolSessionState> => {
    const result = new Map<string, PoolSessionState>();
    for (const [id, conn] of connectionsRef.current) {
      result.set(id, { connectionHealth: conn.connectionHealth, isBusy: conn.isBusy });
    }
    return result;
  }, []);

  // Retry stale connections when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      for (const conn of connectionsRef.current.values()) {
        const h = conn.connectionHealth;
        if ((h === 'disconnected' || h === 'failed') && lruRef.current.includes(conn.sessionId)) {
          conn.retry();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    return () => {
      for (const conn of connectionsRef.current.values()) conn.destroy();
    };
  }, []);

  return { setCredentials, connect, disconnect, disconnectAll, getConnection, getSessionStates };
}
