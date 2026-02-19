'use client';

import { useAuth } from '@clerk/nextjs';
import { Loader } from '@/components/ui/loader';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-[calc(100dvh-4.1rem)] items-center justify-center">
        <Loader variant="glowing" size="large" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4.1rem)] w-full overflow-hidden">{children}</div>
  );
}
