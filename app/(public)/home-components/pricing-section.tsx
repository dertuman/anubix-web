'use client';

import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';

const PLAN_KEYS = ['free', 'payg', 'byok'] as const;
type PlanKey = (typeof PLAN_KEYS)[number];

const FEATURED_PLAN: PlanKey = 'payg';

const FEATURE_KEYS = ['feature1', 'feature2', 'feature3', 'feature4'] as const;

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
          <p className="mt-2 text-base text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Plans */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {PLAN_KEYS.map((planKey) => {
            const featured = planKey === FEATURED_PLAN;
            return (
              <div
                key={planKey}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all sm:p-8 ${
                  featured
                    ? 'border-primary/40 bg-primary/5 shadow-xl shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/20 hover:bg-primary-muted'
                }`}
              >
                {featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Most popular
                    </span>
                  </div>
                )}

                <div>
                  <p
                    className={`text-lg font-bold ${
                      featured ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {t(`${planKey}.name` as 'free.name')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`${planKey}.tagline` as 'free.tagline')}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {FEATURE_KEYS.map((fKey) => (
                    <li
                      key={fKey}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {t(`${planKey}.${fKey}` as 'free.feature1')}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link href="/sign-up">
                    <Button
                      variant={featured ? 'default' : 'outline'}
                      size="lg"
                      className="w-full gap-2 font-semibold"
                    >
                      {t(`${planKey}.cta` as 'free.cta')}
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
