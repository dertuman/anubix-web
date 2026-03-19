'use client';

import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';

const FEATURE_KEYS = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6'] as const;

export function PricingSection() {
  const t = useScopedI18n('home.pricing');

  return (
    <section id="pricing">
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-10">
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
          <div className="mx-auto mt-16 max-w-md">
            <div className="relative flex flex-col rounded-2xl border border-primary/40 bg-primary/5 p-6 shadow-xl shadow-primary/10 sm:p-8">
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  {t('badge')}
                </span>
              </div>

              {/* Price */}
              <div className="mt-4 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{t('price')}</span>
                  <span className="text-lg text-muted-foreground">{t('period')}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('subtitle')}
                </p>
              </div>

              {/* Features */}
              <ul className="mt-8 flex-1 space-y-3">
                {FEATURE_KEYS.map((fKey) => (
                  <li
                    key={fKey}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {t(fKey)}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8">
                <Link href="/workspace">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                  >
                    {t('cta')}
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
