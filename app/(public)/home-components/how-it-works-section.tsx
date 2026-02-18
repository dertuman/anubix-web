'use client';

import { useScopedI18n } from '@/locales/client';

const STEP_KEYS = ['step1', 'step2', 'step3'] as const;

export function HowItWorksSection() {
  const t = useScopedI18n('home.howItWorks');

  return (
    <section id="how-it-works" className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('title')}
          </h2>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEP_KEYS.map((key, i) => (
            <div key={key} className="relative text-center">
              {/* Step number */}
              <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-lg font-bold text-primary">
                {i + 1}
              </div>

              {/* Connector line (hidden on last item and on mobile) */}
              {i < STEP_KEYS.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-4rem)] bg-border md:block" />
              )}

              <h3 className="text-lg font-semibold text-foreground">
                {t(`${key}.title` as 'step1.title')}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`${key}.description` as 'step1.description')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
