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
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // Get initial mode from URL param, default to 'code'
  const initialMode = (searchParams.get('mode') === 'chat' ? 'chat' : 'code') as WorkspaceMode;
  const [mode, setModeState] = useState<WorkspaceMode>(initialMode);

  // Demo mode tracking - check URL param
  const isDemoMode = searchParams.get('demo') === 'true';
  const [demoPromptCount, setDemoPromptCount] = useState(0);

  // Demo preview mode - passive viewing for unauthenticated users
  // This is different from isDemoMode (1 free interactive prompt)
  // Demo preview shows mock data and prompts for signup
  const isDemoPreview = !isSignedIn && !isDemoMode;

  // Update URL when mode changes
  const setMode = (newMode: WorkspaceMode) => {
    setModeState(newMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', newMode);
    router.replace(`/workspace?${params.toString()}`, { scroll: false });
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

  return (
    <WorkspaceContext.Provider value={{
      mode,
      setMode,
      isDemoMode,
      isDemoPreview,
      demoPromptCount,
      incrementDemoPromptCount,
      resetDemoPromptCount
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
