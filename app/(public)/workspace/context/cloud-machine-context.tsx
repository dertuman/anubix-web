'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useCloudMachine, type UseCloudMachineReturn } from '@/hooks/useCloudMachine';

const CloudMachineContext = createContext<UseCloudMachineReturn | undefined>(undefined);

export function useCloudMachineContext() {
  const context = useContext(CloudMachineContext);
  if (!context) {
    throw new Error('useCloudMachineContext must be used within CloudMachineProvider');
  }
  return context;
}

export function CloudMachineProvider({ children }: { children: ReactNode }) {
  const value = useCloudMachine();

  return (
    <CloudMachineContext.Provider value={value}>
      {children}
    </CloudMachineContext.Provider>
  );
}
