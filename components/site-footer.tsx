'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';

export function SiteFooter() {
  const t = useScopedI18n('footer');

  const columns = [
    {
      title: t('product'),
      links: [
        { label: t('features'), href: '/#features' },
        { label: t('howItWorks'), href: '/#how-it-works' },
        { label: t('pricing'), href: '#' },
      ],
    },
    {
      title: t('resources'),
      links: [
        { label: t('documentation'), href: '#' },
        { label: t('community'), href: '#' },
        { label: t('support'), href: '#' },
      ],
    },
    {
      title: t('legal'),
      links: [
        { label: t('privacy'), href: '#' },
        { label: t('terms'), href: '#' },
      ],
    },
  ];

  return (
    <footer className="border-border bg-background border-t">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 inline-flex items-center gap-2">
              <Image
                src="/logo.webp"
                alt={t('logoAlt')}
                width={28}
                height={28}
              />
              <span className="text-base font-bold tracking-tight">Anubix</span>
            </Link>
            <p className="text-muted-foreground mt-3 max-w-xs text-sm">
              {t('companyDescription')}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase">
                {column.title}
              </p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-border mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-muted-foreground text-xs">
            {t('allRightsReserved', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
