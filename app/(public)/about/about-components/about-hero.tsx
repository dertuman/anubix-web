'use client';

import { useScopedI18n } from '@/locales/client';

export function AboutHero() {
  const t = useScopedI18n('about.hero');

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary-muted),transparent_50%)]" />

      <div className="container relative mx-auto px-4 py-20 text-center md:py-32">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          {t('label')}
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {t('title')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t('subtitle')}
        </p>
      </div>
    </section>
  );
}
