'use client';

import { useScopedI18n } from '@/locales/client';
import { MessageSquareText, Code2, Globe } from 'lucide-react';

const STEP_KEYS = ['step1', 'step2', 'step3'] as const;
const STEP_ICONS = [MessageSquareText, Code2, Globe] as const;

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
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEP_KEYS.map((key, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div key={key} className="relative text-center">
                {/* Step icon */}
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/10 text-primary transition-colors">
                  <Icon className="size-7" />
                </div>

                {/* Step counter */}
                <div className="mx-auto mb-4 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>

                {/* Connector line (hidden on last item and on mobile) */}
                {i < STEP_KEYS.length - 1 && (
                  <div className="absolute left-[calc(50%+3rem)] top-8 hidden h-px w-[calc(100%-6rem)] bg-border md:block" />
                )}

                <h3 className="text-lg font-semibold text-foreground">
                  {t(`${key}.title` as 'step1.title')}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t(`${key}.description` as 'step1.description')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
