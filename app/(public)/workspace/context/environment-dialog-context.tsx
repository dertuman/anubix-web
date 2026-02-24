'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface EnvironmentDialogContextValue {
  isOpen: boolean;
  showEnvironmentDialog: () => void;
  hideEnvironmentDialog: () => void;
}

const EnvironmentDialogContext = createContext<EnvironmentDialogContextValue | undefined>(undefined);

export function useEnvironmentDialog() {
  const context = useContext(EnvironmentDialogContext);
  if (!context) {
    throw new Error('useEnvironmentDialog must be used within EnvironmentDialogProvider');
  }
  return context;
}

interface EnvironmentDialogProviderProps {
  children: ReactNode;
}

export function EnvironmentDialogProvider({ children }: EnvironmentDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showEnvironmentDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const hideEnvironmentDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <EnvironmentDialogContext.Provider
      value={{
        isOpen,
        showEnvironmentDialog,
        hideEnvironmentDialog,
      }}
    >
      {children}
    </EnvironmentDialogContext.Provider>
  );
}
