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
