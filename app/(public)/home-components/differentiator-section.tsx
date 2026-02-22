'use client';

import { useScopedI18n } from '@/locales/client';
import { Check, X } from 'lucide-react';

export function DifferentiatorSection() {
  const t = useScopedI18n('home.differentiator');

  const rows = [
    { others: t('row1Others'), anubix: t('row1Anubix') },
    { others: t('row2Others'), anubix: t('row2Anubix') },
    { others: t('row3Others'), anubix: t('row3Anubix') },
    { others: t('row4Others'), anubix: t('row4Anubix') },
    { others: t('row5Others'), anubix: t('row5Anubix') },
  ];

  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary-muted),transparent_50%)] opacity-40" />

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

        <div className="mx-auto mt-10 max-w-3xl space-y-4 text-center">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body')}
          </p>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body2')}
          </p>
        </div>

        {/* Two-column comparison table */}
        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-border">
          {/* Table header */}
          <div className="grid grid-cols-2 border-b border-border bg-muted/50">
            <div className="p-4 text-sm font-semibold text-muted-foreground">
              {t('othersLabel')}
            </div>
            <div className="border-l border-border bg-primary/5 p-4 text-sm font-semibold text-primary">
              {t('anubixLabel')}
            </div>
          </div>

          {/* Table rows */}
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-2 border-b border-border last:border-0"
            >
              <div className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
                <X className="mt-0.5 size-4 shrink-0 text-destructive/50" />
                {row.others}
              </div>
              <div className="flex items-start gap-2 border-l border-border bg-primary/5 p-4 text-sm text-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {row.anubix}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
