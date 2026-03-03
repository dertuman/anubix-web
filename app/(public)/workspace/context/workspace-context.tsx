'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export type WorkspaceMode = 'chat' | 'code';

interface WorkspaceContextValue {
  mode: WorkspaceMode;
  setMode: (_value: WorkspaceMode) => void;
  isDemoMode: boolean;
  isDemoPreview: boolean;
  demoPromptCount: number;
  incrementDemoPromptCount: () => void;
  resetDemoPromptCount: () => void;
  pendingPrompt: string | null;
  clearPendingPrompt: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  // Get initial mode from URL param, default to 'code'
  const initialMode = (searchParams.get('mode') === 'chat' ? 'chat' : 'code') as WorkspaceMode;
  const [mode, setModeState] = useState<WorkspaceMode>(initialMode);

  // Demo prompt tracking
  const [demoPromptCount, setDemoPromptCount] = useState(0);

  // Pending prompt from homepage
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // Unauthenticated users always see demo preview with mock data.
  // While Clerk is loading, default to false to avoid a flash of demo for auth users.
  const isDemoMode = authLoaded ? !isSignedIn : false;
  const isDemoPreview = authLoaded ? !isSignedIn : false;

  // Update URL when mode changes
  const setMode = (newMode: WorkspaceMode) => {
    setModeState(newMode);
    router.replace(`/workspace?mode=${newMode}`, { scroll: false });
  };

  // Demo prompt tracking functions
  const incrementDemoPromptCount = () => {
    setDemoPromptCount(prev => prev + 1);
  };

  const resetDemoPromptCount = () => {
    setDemoPromptCount(0);
  };

  // Sync mode with URL changes
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'chat' || urlMode === 'code') {
      setModeState(urlMode);
    }
  }, [searchParams]);

  // Check for pending prompt from homepage (URL param or sessionStorage)
  useEffect(() => {
    const urlPrompt = searchParams.get('prompt');
    if (urlPrompt) {
      setPendingPrompt(urlPrompt);
      // Clean URL without losing other params
      const params = new URLSearchParams(searchParams.toString());
      params.delete('prompt');
      router.replace(`/workspace?${params.toString()}`, { scroll: false });
      return;
    }

    const stored = sessionStorage.getItem('anubix_pending_prompt');
    if (stored) {
      setPendingPrompt(stored);
      sessionStorage.removeItem('anubix_pending_prompt');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearPendingPrompt = () => setPendingPrompt(null);

  return (
    <WorkspaceContext.Provider value={{
      mode,
      setMode,
      isDemoMode,
      isDemoPreview,
      demoPromptCount,
      incrementDemoPromptCount,
      resetDemoPromptCount,
      pendingPrompt,
      clearPendingPrompt
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
