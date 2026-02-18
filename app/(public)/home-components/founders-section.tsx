'use client';

import Image from 'next/image';
import { useScopedI18n } from '@/locales/client';

const FOUNDERS = [
  {
    key: 'alex' as const,
    image: '/alex_transparent.webp',
  },
  {
    key: 'fionn' as const,
    image: '/fionn_transparent.webp',
  },
] as const;

export function FoundersSection() {
  const t = useScopedI18n('home.founders');

  return (
    <section className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        {/* Founders grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 mx-auto max-w-3xl">
          {FOUNDERS.map((founder) => (
            <div
              key={founder.key}
              className="group relative flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:border-primary/30 hover:bg-primary-muted"
            >
              {/* Photo */}
              <div className="relative mb-6 size-40 overflow-hidden rounded-full border-2 border-primary/20 bg-primary/5 transition-colors group-hover:border-primary/40">
                <Image
                  src={founder.image}
                  alt={t(`${founder.key}.name` as 'alex.name')}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 160px, 160px"
                />
              </div>

              {/* Name & role */}
              <h3 className="text-xl font-semibold text-foreground">
                {t(`${founder.key}.name` as 'alex.name')}
              </h3>
              <p className="mt-1 text-sm font-medium text-primary">
                {t(`${founder.key}.role` as 'alex.role')}
              </p>

              {/* Bio */}
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {t(`${founder.key}.bio` as 'alex.bio')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
