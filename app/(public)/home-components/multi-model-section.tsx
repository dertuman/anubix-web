'use client';

import { useScopedI18n } from '@/locales/client';
import { Brain, Zap, Layers, Search, Palette } from 'lucide-react';

const MODELS = [
  { key: 'claude', Icon: Brain },
  { key: 'gpt', Icon: Zap },
  { key: 'gemini', Icon: Layers },
  { key: 'perplexity', Icon: Search },
  { key: 'dalle', Icon: Palette },
] as const;

export function MultiModelSection() {
  const t = useScopedI18n('home.multiModel');

  return (
    <section className="relative border-t border-border bg-muted/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--primary-muted),transparent_50%)] opacity-40" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body')}
          </p>
        </div>

        {/* Model cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {MODELS.map(({ key, Icon }) => (
            <div
              key={key}
              className="group rounded-xl border border-border bg-card p-5 text-center transition-all hover:border-primary/30 hover:bg-primary-muted hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <Icon className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t(`${key}.title` as 'claude.title')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(`${key}.description` as 'claude.description')}
              </p>
            </div>
          ))}
        </div>

        {/* Switch note */}
        <p className="mx-auto mt-8 max-w-xl text-center text-sm text-muted-foreground">
          {t('switchNote')}
        </p>

        {/* One-liner callout */}
        <div className="mx-auto mt-6 max-w-2xl">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-4 text-center">
            <p className="text-base font-semibold text-foreground">
              {t('oneliner')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
