'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import { Button } from '@/components/ui/button';

export function PricingSection() {
  const t = useScopedI18n('home.pricing');

  return (
    <section id="pricing" className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--primary-muted),transparent_50%)] opacity-30" />

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

        {/* Single pricing card */}
        <div className="mx-auto mt-16 max-w-2xl">
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:border-primary/30 hover:bg-primary-muted sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary-muted),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('description')}
              </p>
            </div>
          </div>
        </div>

        {/* Callout + CTA */}
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-base font-semibold text-foreground sm:text-lg">
            {t('callout')}
          </p>
          <div className="mt-8">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="gap-2 px-8 text-base font-semibold"
              >
                {t('cta')}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
