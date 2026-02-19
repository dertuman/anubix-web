'use client';

import { useScopedI18n } from '@/locales/client';
import {
  List,
  Search,
  ShieldCheck,
  CreditCard,
  Upload,
  Radio,
} from 'lucide-react';

const PATTERN_ICONS = [List, Search, ShieldCheck, CreditCard, Upload, Radio] as const;
const PATTERN_KEYS = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'] as const;

export function PatternsSection() {
  const t = useScopedI18n('home.patterns');

  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary-muted),transparent_50%)] opacity-40" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {t('label')}
            </p>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              {t('badge')}
            </span>
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Patterns grid */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATTERN_KEYS.map((key, i) => {
            const Icon = PATTERN_ICONS[i];
            return (
              <div
                key={key}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:bg-primary-muted hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary-muted),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t(`${key}.title` as 'item1.title')}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t(`${key}.description` as 'item1.description')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Visual hint — drag and drop metaphor */}
        <div className="mx-auto mt-12 max-w-md text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-dashed border-primary/30 bg-primary/5 px-6 py-3 text-sm text-muted-foreground">
            <div className="flex size-6 items-center justify-center rounded bg-primary/10">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="size-4 text-primary"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="1" width="10" height="4" rx="1" />
                <path d="M8 5v6m0 0l-2.5-2.5M8 11l2.5-2.5" />
                <rect x="3" y="11" width="10" height="4" rx="1" />
              </svg>
            </div>
            Drag a pattern into your project. That&apos;s it.
          </div>
        </div>
      </div>
    </section>
  );
}
