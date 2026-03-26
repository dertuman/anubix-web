// localStorage persistence for Claude Code Bridge.
// Bridge server is the source of truth — this is just a cache.

const PREFIX = 'ccb_';

function get(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PREFIX + key);
}

function set(key: string, value: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFIX + key, value);
}

function remove(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREFIX + key);
}

// ── Session ─────────────────────────────────────────────────

export function getLastSessionId(): string | null {
  return get('lastSessionId');
}
export function setLastSessionId(id: string) {
  set('lastSessionId', id);
}
export function clearLastSessionId() {
  remove('lastSessionId');
}

// ── Recent repo paths ───────────────────────────────────────

const MAX_RECENT = 10;

export function getRecentRepoPaths(): string[] {
  const raw = get('recentRepoPaths');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch (err) {
    console.error('Failed to parse recent repo paths:', err);
    return [];
  }
}

export function addRecentRepoPath(path: string) {
  const existing = getRecentRepoPaths().filter((p) => p !== path);
  existing.unshift(path);
  set('recentRepoPaths', JSON.stringify(existing.slice(0, MAX_RECENT)));
}

// ── Session list cache (survives machine restarts) ──────────

export function getCachedSessions(): Array<{ id: string; name: string; repoPath: string; repoPaths?: string[]; mode?: 'sdk' | 'cli'; model?: string }> {
  const raw = get('cachedSessions');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCachedSessions(sessions: Array<{ id: string; name: string; repoPath: string; repoPaths?: string[]; mode?: 'sdk' | 'cli'; model?: string }>) {
  set('cachedSessions', JSON.stringify(sessions));
}

export function clearCachedSessions() {
  remove('cachedSessions');
}

// ── Per-session messages cache ──────────────────────────────

export function getSessionMessages(sessionId: string): unknown[] {
  const raw = get(`msgs_${sessionId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as unknown[];
  } catch (err) {
    console.error(`Failed to parse session messages for ${sessionId}:`, err);
    return [];
  }
}

export function setSessionMessages(sessionId: string, messages: unknown[]) {
  set(`msgs_${sessionId}`, JSON.stringify(messages));
}

export function clearSessionMessages(sessionId: string) {
  remove(`msgs_${sessionId}`);
}

// ── Per-session input draft ─────────────────────────────────

export function getSessionDraft(sessionId: string): string {
  return get(`draft_${sessionId}`) ?? '';
}

export function setSessionDraft(sessionId: string, text: string) {
  if (text) {
    set(`draft_${sessionId}`, text);
  } else {
    remove(`draft_${sessionId}`);
  }
}

// ── Per-session last seq number ─────────────────────────────

export function getSessionLastSeq(sessionId: string): number {
  const raw = get(`seq_${sessionId}`);
  return raw ? Number(raw) : 0;
}

export function setSessionLastSeq(sessionId: string, seq: number) {
  set(`seq_${sessionId}`, String(seq));
}

// ── Bridge connection credentials (local fallback) ────────

export function getBridgeUrl(): string {
  return get('bridgeUrl') ?? '';
}

export function setBridgeUrl(url: string) {
  set('bridgeUrl', url);
}

export function getApiKey(): string {
  return get('apiKey') ?? '';
}

export function setApiKey(key: string) {
  if (key) {
    set('apiKey', key);
  } else {
    remove('apiKey');
  }
}
