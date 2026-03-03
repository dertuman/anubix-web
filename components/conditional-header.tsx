'use client';

import { usePathname } from 'next/navigation';

import { SiteHeader } from '@/components/site-header';

export function ConditionalHeader() {
  const pathname = usePathname();
  const headerHiddenPaths: string[] = ['/workspace'];

  if (pathname === '/' || headerHiddenPaths.some((path) => pathname.includes(path))) {
    return null;
  }

  return <SiteHeader />;
}
