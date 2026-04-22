'use client';

import { useCallback, useEffect, useState } from 'react';

export type EnvPreference = 'local' | 'cloud' | null;

const STORAGE_KEY = 'anubix.preferred-environment';

/**
 * Single source of truth for "cloud or local?". The user picks once in the
 * environment dialog and we stick to it until they explicitly change it.
 *
 * No magic auto-switching based on whether the laptop is reachable — if you
 * pick local and your laptop is off, the workspace says so and waits. That's
 * what the user wants to see.
 */
export function usePreferredEnvironment() {
  const [preferred, setPreferredState] = useState<EnvPreference>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'local' || stored === 'cloud') setPreferredState(stored);
  }, []);

  const setPreferred = useCallback((p: EnvPreference) => {
    setPreferredState(p);
    if (typeof window === 'undefined') return;
    if (p) window.localStorage.setItem(STORAGE_KEY, p);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { preferred, setPreferred };
}
