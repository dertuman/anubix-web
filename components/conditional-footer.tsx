'use client';

import { usePathname } from 'next/navigation';

import { SiteFooter } from '@/components/site-footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  const footerHiddenPaths: string[] = [];

  if (footerHiddenPaths.some((path) => pathname.includes(path))) {
    return null;
  }

  return <SiteFooter />;
}
