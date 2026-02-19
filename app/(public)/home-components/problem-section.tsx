'use client';

import { useScopedI18n } from '@/locales/client';
import { AlertTriangle } from 'lucide-react';

export function ProblemSection() {
  const t = useScopedI18n('home.problem');

  return (
    <section className="relative border-t border-border">
      {/* Subtle dark gradient for contrast */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--primary-muted),transparent_60%)] opacity-30" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
        </div>

        {/* Body */}
        <div className="mx-auto mt-12 max-w-2xl space-y-6">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body')}
          </p>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body2')}
          </p>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body3')}
          </p>
        </div>

        {/* Bold callout */}
        <div className="mx-auto mt-12 max-w-2xl">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--primary-muted),transparent_60%)] opacity-40" />
            <div className="relative flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <AlertTriangle className="size-5 text-primary" />
              </div>
              <p className="text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                {t('callout')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
