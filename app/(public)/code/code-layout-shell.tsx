'use client';

import { useAuth } from '@clerk/nextjs';
import { Loader } from '@/components/ui/loader';

interface CodeLayoutShellProps {
  children: React.ReactNode;
}

export default function CodeLayoutShell({ children }: CodeLayoutShellProps) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader variant="glowing" size="large" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">{children}</div>
  );
}
