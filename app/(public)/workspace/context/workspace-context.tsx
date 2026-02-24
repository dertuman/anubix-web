'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type WorkspaceMode = 'chat' | 'code';

interface WorkspaceContextValue {
  mode: WorkspaceMode;
  setMode: (_value: WorkspaceMode) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial mode from URL param, default to 'code'
  const initialMode = (searchParams.get('mode') === 'chat' ? 'chat' : 'code') as WorkspaceMode;
  const [mode, setModeState] = useState<WorkspaceMode>(initialMode);

  // Update URL when mode changes
  const setMode = (newMode: WorkspaceMode) => {
    setModeState(newMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', newMode);
    router.replace(`/workspace?${params.toString()}`, { scroll: false });
  };

  // Sync mode with URL changes
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'chat' || urlMode === 'code') {
      setModeState(urlMode);
    }
  }, [searchParams]);

  return (
    <WorkspaceContext.Provider value={{ mode, setMode }}>
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
