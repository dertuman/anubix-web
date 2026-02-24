'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useClaudeCode, type UseClaudeCodeReturn } from '@/hooks/useClaudeCode';

const ClaudeCodeContext = createContext<UseClaudeCodeReturn | undefined>(undefined);

export function useClaudeCodeContext() {
  const context = useContext(ClaudeCodeContext);
  if (!context) {
    throw new Error('useClaudeCodeContext must be used within ClaudeCodeProvider');
  }
  return context;
}

export function ClaudeCodeProvider({ children }: { children: ReactNode }) {
  const value = useClaudeCode();

  return (
    <ClaudeCodeContext.Provider value={value}>
      {children}
    </ClaudeCodeContext.Provider>
  );
}
