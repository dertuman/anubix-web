'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  comingSoon?: boolean;
  isPublic?: boolean;
  requireAdmin?: boolean;
}

interface MainNavProps {
  items?: NavItem[];
}

export function MainNav({ items }: MainNavProps) {
  const tCommon = useScopedI18n('common');

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="flex items-center space-x-2">
        <Image src="/logo.webp" alt="Anubix logo" width={32} height={32} />
        <span className="text-lg font-bold tracking-tight">Anubix</span>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items?.map(
            (item, index) =>
              item.href && (
                <Link
                  key={index}
                  href={item.comingSoon ? '#' : item.href}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground flex items-center rounded-md px-4 py-2 text-sm font-medium active:translate-y-0.5',
                    item.disabled && 'cursor-not-allowed opacity-80'
                  )}
                >
                  {item.title}
                  {item.comingSoon && (
                    <Badge
                      variant="exciting"
                      className="relative top-[-9px] h-4 text-[9px]"
                    >
                      {tCommon('comingSoon')}
                    </Badge>
                  )}
                </Link>
              )
          )}
        </nav>
      ) : null}
    </div>
  );
}
