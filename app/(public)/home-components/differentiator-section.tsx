'use client';

import { useScopedI18n } from '@/locales/client';
import { Cloud, Terminal, Smartphone, ShieldCheck } from 'lucide-react';

export function DifferentiatorSection() {
  const t = useScopedI18n('home.differentiator');

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

        {/* Body content with visual accents */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="grid gap-8 md:grid-cols-[1fr_auto]">
            <div className="space-y-6">
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
          </div>

          {/* Security callout */}
          <div className="mt-8 overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <p className="text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                {t('securityCallout')}
              </p>
            </div>
          </div>

          {/* Visual feature indicators */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Terminal,
                label: 'Real terminal access',
                description: 'Not API calls',
              },
              {
                icon: Cloud,
                label: 'Cloud workspace',
                description: 'Not local-only',
              },
              {
                icon: Smartphone,
                label: 'Any device',
                description: 'Phone, tablet, laptop',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary-muted"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
