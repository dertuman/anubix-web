'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { FileAttachment } from '@/types/code';
import type { BridgeSession, CodeMessage, SlashCommand } from '@/types/code';
import {
  addRecentRepoPath,
  clearLastSessionId,
  clearSessionMessages,
  getCachedSessions,
  getLastSessionId,
  getSessionDraft,
  getSessionMessages,
  getSessionLastSeq,
  setCachedSessions,
  setLastSessionId,
  setSessionDraft,
  setSessionMessages,
  setSessionLastSeq,
} from '@/lib/stores/bridge-store';
import { processAttachments } from '@/lib/process-attachments';

import type { ConnectionHealth } from './useSessionConnection';
import { useSessionPool, type PoolSessionState } from './useSessionPool';

// ── Helpers ─────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function httpBase(url: string) {
  let base = url.replace(/\/ws(\/.*)?$/, '');
  base = base.replace(/^ws(s?):\/\//, 'http$1://');
  return base;
}

// ── Types ───────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface BridgeRepo {
  name: string;
  path: string;
}

export interface FetchReposResult {
  repos: BridgeRepo[];
  basePath: string | null;
}

export interface PullResult {
  path: string;
  output?: string;
  error?: string;
}

export interface BridgeLogs {
  lines: string[];
  total: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

export interface UseClaudeCodeReturn {
  status: ConnectionStatus;
  connect: (_url: string, _apiKey: string) => void;
  disconnect: () => void;
  softDisconnect: () => void;
  connectionError: string | null;
  sessions: BridgeSession[];
  activeSessionId: string | null;
  selectSession: (_id: string) => void;
  createSession: (_repoPath: string | string[], _name: string, _model?: string) => Promise<BridgeSession | null>;
  deleteSession: (_id: string) => Promise<void>;
  updateSession: (_id: string, _updates: { name?: string; repoPaths?: string[]; mode?: 'sdk' | 'cli'; model?: string }) => Promise<void>;
  refreshSessions: () => Promise<void>;
  pullSession: (_id: string) => Promise<PullResult[] | null>;
  fetchRepos: () => Promise<FetchReposResult>;
  messages: CodeMessage[];
  sendMessage: (_text: string, _files?: FileAttachment[]) => Promise<void>;
  clearConversation: () => void;
  switchModel: (_model?: string) => void;
  approve: () => void;
  deny: () => void;
  answerQuestion: (_answers: Record<string, string>) => void;
  abort: () => void;
  isBusy: boolean;
  slashCommands: SlashCommand[];
  connectionHealth: ConnectionHealth;
  retry: () => void;
  sessionLiveStates: Map<string, PoolSessionState>;
  fetchLogs: (_opts?: { last?: number; filter?: string }) => Promise<BridgeLogs>;
  execCommand: (_command: string) => Promise<ExecResult>;
  pushCredentials: (_opts: { claudeMode: 'cli' | 'sdk'; claudeAuthJson?: string; anthropicApiKey?: string }) => Promise<void>;
}

// ── Hook ────────────────────────────────────────────────────

export function useClaudeCode(): UseClaudeCodeReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  // Initialize sessions from localStorage cache so sidebar shows them when machine is off
  const [sessions, setSessions] = useState<BridgeSession[]>(() => {
    const cached = getCachedSessions();
    return cached.map((s) => ({
      id: s.id,
      name: s.name,
      repoPath: s.repoPath,
      repoPaths: s.repoPaths,
      status: 'idle' as const,
      createdAt: 0,
      lastActiveAt: 0,
      mode: s.mode,
      model: s.model,
    }));
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => getLastSessionId());
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const baseUrlRef = useRef('');
  const keyRef = useRef('');
  const activeSessionRef = useRef<string | null>(null);

  const pool = useSessionPool();

  useEffect(() => { activeSessionRef.current = activeSessionId; }, [activeSessionId]);

  // Derived state from active connection
  const activeConn = activeSessionId ? pool.getConnection(activeSessionId) : null;
  // Fall back to cached messages when no active connection (machine is off)
  const messages: CodeMessage[] = activeConn?.messages
    ?? (activeSessionId ? getSessionMessages(activeSessionId) as CodeMessage[] : []);
  const isBusy = activeConn?.isBusy ?? false;
  const connectionHealth: ConnectionHealth = activeConn?.connectionHealth ?? 'disconnected';
  const slashCommands = activeConn?.slashCommands ?? [];
  const sessionLiveStates = pool.getSessionStates();

  // ── HTTP helpers ──────────────────────────────────────────

  const apiFetch = useCallback(async (path: string, init?: RequestInit) => {
    const url = `${httpBase(baseUrlRef.current)}/_bridge${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(keyRef.current ? { 'x-api-key': keyRef.current } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiFetch('/sessions');
      const list = (data.data ?? data) as BridgeSession[];
      setSessions(list);
      // Cache session list so we can recover after machine restart
      setCachedSessions(list.map((s) => ({
        id: s.id,
        name: s.name,
        repoPath: s.repoPath,
        repoPaths: s.repoPaths,
        mode: s.mode,
        model: s.model,
      })));
      return list;
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setSessions([]);
      return [];
    }
  }, [apiFetch]);

  const fetchRepos = useCallback(async (): Promise<FetchReposResult> => {
    try {
      const data = await apiFetch('/sessions/repos');
      return { repos: (data.data ?? []) as BridgeRepo[], basePath: (data.basePath as string) ?? null };
    } catch (err) {
      console.error('Failed to fetch repos:', err);
      return { repos: [], basePath: null };
    }
  }, [apiFetch]);

  // ── Session recovery ──────────────────────────────────────

  const recoverSessions = useCallback(async (): Promise<BridgeSession[]> => {
    const cached = getCachedSessions();
    if (!cached.length) return [];

    const recovered: BridgeSession[] = [];
    const lastSid = getLastSessionId();

    for (const old of cached) {
      try {
        const repoPaths = old.repoPaths ?? [old.repoPath];
        const body: Record<string, unknown> = {
          repoPaths,
          name: old.name,
        };
        if (old.model) body.model = old.model;

        const data = await apiFetch('/sessions', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const newSession = (data.data ?? data) as BridgeSession;
        recovered.push(newSession);

        // Migrate cached data from old session ID to new session ID
        if (newSession.id !== old.id) {
          const oldMessages = getSessionMessages(old.id);
          if (oldMessages.length) {
            setSessionMessages(newSession.id, oldMessages);
            clearSessionMessages(old.id);
          }
          const oldSeq = getSessionLastSeq(old.id);
          if (oldSeq) {
            setSessionLastSeq(newSession.id, oldSeq);
          }
          const oldDraft = getSessionDraft(old.id);
          if (oldDraft) {
            setSessionDraft(newSession.id, oldDraft);
          }
          // Update last session ID pointer if it was the old one
          if (lastSid === old.id) {
            setLastSessionId(newSession.id);
          }
        }
      } catch (err) {
        console.error(`Failed to recover session "${old.name}":`, err);
      }
    }

    if (recovered.length) {
      setSessions(recovered);
      // Update cache with new IDs
      setCachedSessions(recovered.map((s) => ({
        id: s.id,
        name: s.name,
        repoPath: s.repoPath,
        repoPaths: s.repoPaths,
        mode: s.mode,
        model: s.model,
      })));
    }

    return recovered;
  }, [apiFetch]);

  // ── Connect ───────────────────────────────────────────────

  const connect = useCallback(async (url: string, apiKey: string) => {
    baseUrlRef.current = url.replace(/\/ws(\/.*)?$/, '').replace(/\/$/, '');
    keyRef.current = apiKey;
    setStatus('connecting');
    setConnectionError(null);

    try {
      const res = await fetch(`${httpBase(baseUrlRef.current)}/_bridge/health`, {
        headers: keyRef.current ? { 'x-api-key': keyRef.current } : {},
      });
      if (!res.ok) {
        throw new Error(
          res.status === 401 || res.status === 403
            ? 'Invalid API key. Please check your credentials.'
            : `Failed to connect: ${res.status} ${res.statusText}`
        );
      }

      setStatus('connected');
      pool.setCredentials(baseUrlRef.current, apiKey);

      let sessions = await fetchSessions();

      // If bridge returned no sessions but we have cached ones, attempt recovery
      if (sessions.length === 0) {
        const recovered = await recoverSessions();
        if (recovered.length) {
          sessions = recovered;
        }
      }

      const lastSid = getLastSessionId();
      if (lastSid && sessions.some((s) => s.id === lastSid)) {
        setActiveSessionId(lastSid);
        pool.connect(lastSid);
      }
    } catch (err) {
      let msg = 'Failed to connect. Please check the URL and try again.';
      if (err instanceof Error) {
        msg = err.message === 'Failed to fetch' || err.name === 'TypeError'
          ? 'Unable to reach bridge server. Check URL and network connection.'
          : err.message;
      }
      setConnectionError(msg);
      setStatus('disconnected');
    }
  }, [fetchSessions, recoverSessions, pool]);

  const disconnect = useCallback(() => {
    pool.disconnectAll();
    baseUrlRef.current = '';
    keyRef.current = '';
    setStatus('disconnected');
    setSessions([]);
    setActiveSessionId(null);
    setConnectionError(null);
    // NOTE: Do NOT clear cached sessions — they're needed for recovery after machine restart
  }, [pool]);

  /** Close WebSockets but preserve sessions and credentials for resume. */
  const softDisconnect = useCallback(() => {
    pool.disconnectAll();
    setStatus('disconnected');
    // Do NOT clear sessions, activeSessionId, baseUrlRef, or keyRef
  }, [pool]);

  // ── Sync status with WebSocket health ─────────────────────
  // When connection goes to 'failed' while status is 'connected',
  // set status to 'disconnected' so auto-reconnect pipeline can fire.
  useEffect(() => {
    if (status === 'connected' && connectionHealth === 'failed') {
      setStatus('disconnected');
    }
  }, [status, connectionHealth]);

  // ── Session management ────────────────────────────────────

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setLastSessionId(id);
    pool.connect(id);
  }, [pool]);

  const createSession = useCallback(async (repoPath: string | string[], name: string, model?: string): Promise<BridgeSession | null> => {
    try {
      const isMulti = Array.isArray(repoPath);
      const body = isMulti
        ? { repoPaths: repoPath, name, ...(model ? { model } : {}) }
        : { repoPath, name, ...(model ? { model } : {}) };
      const data = await apiFetch('/sessions', { method: 'POST', body: JSON.stringify(body) });
      const session = (data.data ?? data) as BridgeSession;
      if (isMulti) repoPath.forEach(addRecentRepoPath);
      else addRecentRepoPath(repoPath);
      await fetchSessions();
      selectSession(session.id);
      return session;
    } catch (err) {
      console.error('Failed to create session:', err);
      return null;
    }
  }, [apiFetch, fetchSessions, selectSession]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
      clearSessionMessages(id);
      pool.disconnect(id);
      if (activeSessionRef.current === id) {
        setActiveSessionId(null);
        clearLastSessionId();
      }
      await fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [apiFetch, fetchSessions, pool]);

  const updateSession = useCallback(async (id: string, updates: { name?: string; repoPaths?: string[]; mode?: 'sdk' | 'cli'; model?: string }) => {
    await apiFetch(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    await fetchSessions();
  }, [apiFetch, fetchSessions]);

  const refreshSessions = useCallback(async () => { await fetchSessions(); }, [fetchSessions]);

  const pullSession = useCallback(async (id: string): Promise<PullResult[] | null> => {
    try {
      const data = await apiFetch(`/sessions/${id}/pull`, { method: 'POST' });
      return (data.data ?? null) as PullResult[] | null;
    } catch (err) {
      console.error('Failed to pull session:', err);
      return null;
    }
  }, [apiFetch]);

  // ── Chat actions ──────────────────────────────────────────

  const sendMessage = useCallback(async (text: string, files?: FileAttachment[]) => {
    if (!activeSessionRef.current || (!text.trim() && (!files || files.length === 0))) return;

    const conn = pool.getConnection(activeSessionRef.current);
    if (!conn) return;

    let finalContent = text.trim();

    if (files?.length) {
      const processed = await processAttachments(files);

      if (processed.textPrefix) {
        finalContent = finalContent ? `${processed.textPrefix}\n\n${finalContent}` : processed.textPrefix;
      }
      if (processed.transcriptions) {
        finalContent = finalContent ? `${processed.transcriptions}\n\n${finalContent}` : processed.transcriptions;
      }
      if (processed.pdfText) {
        finalContent = finalContent ? `${processed.pdfText}\n\n${finalContent}` : processed.pdfText;
      }

      const userMsg: CodeMessage = {
        id: makeId(), ts: Date.now(), type: 'user',
        text: finalContent,
        images: processed.imageDataUrls.length ? processed.imageDataUrls : undefined,
        files,
      };

      conn.addUserMessage(userMsg);

      const contentToSend = !finalContent && processed.images.length ? 'See attached image(s).' : finalContent;
      conn.sendMessage(contentToSend, processed.images.length ? processed.images : undefined);
    } else {
      const userMsg: CodeMessage = {
        id: makeId(), ts: Date.now(), type: 'user',
        text: finalContent,
      };

      conn.addUserMessage(userMsg);
      conn.sendMessage(finalContent);
    }
  }, [pool]);

  const approve = useCallback(() => {
    if (activeSessionRef.current) pool.getConnection(activeSessionRef.current)?.approve();
  }, [pool]);

  const deny = useCallback(() => {
    if (activeSessionRef.current) pool.getConnection(activeSessionRef.current)?.deny();
  }, [pool]);

  const answerQuestion = useCallback((answers: Record<string, string>) => {
    if (activeSessionRef.current) pool.getConnection(activeSessionRef.current)?.answerQuestion(answers);
  }, [pool]);

  const abortAction = useCallback(() => {
    if (activeSessionRef.current) pool.getConnection(activeSessionRef.current)?.abort();
  }, [pool]);

  const clearConversation = useCallback(() => {
    if (activeSessionRef.current) pool.getConnection(activeSessionRef.current)?.clearConversation();
  }, [pool]);

  const switchModel = useCallback((model?: string) => {
    if (activeSessionRef.current) pool.getConnection(activeSessionRef.current)?.switchModel(model);
  }, [pool]);

  const retry = useCallback(() => {
    if (activeSessionRef.current) pool.getConnection(activeSessionRef.current)?.retry();
  }, [pool]);

  // ── Machine debugging helpers ─────────────────────────────

  const fetchLogs = useCallback(async (opts?: { last?: number; filter?: string }): Promise<BridgeLogs> => {
    const params = new URLSearchParams();
    if (opts?.last) params.set('last', String(opts.last));
    if (opts?.filter) params.set('filter', opts.filter);
    const qs = params.toString();
    return apiFetch(`/logs${qs ? `?${qs}` : ''}`);
  }, [apiFetch]);

  const execCommand = useCallback(async (command: string): Promise<ExecResult> => {
    return apiFetch('/exec', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  }, [apiFetch]);

  const pushCredentials = useCallback(async (opts: {
    claudeMode: 'cli' | 'sdk';
    claudeAuthJson?: string;
    anthropicApiKey?: string;
  }) => {
    await apiFetch('/credentials', {
      method: 'POST',
      body: JSON.stringify(opts),
    });
  }, [apiFetch]);

  useEffect(() => {
    return () => { pool.disconnectAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status, connect, disconnect, softDisconnect, connectionError,
    sessions, activeSessionId, selectSession,
    createSession, deleteSession, updateSession, refreshSessions, pullSession,
    fetchRepos, messages, sendMessage, clearConversation, switchModel,
    approve, deny, answerQuestion, abort: abortAction, isBusy,
    slashCommands, connectionHealth, retry, sessionLiveStates,
    fetchLogs, execCommand, pushCredentials,
  };
}
