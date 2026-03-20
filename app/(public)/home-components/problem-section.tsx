'use client';

import { Quote } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

export function ProblemSection() {
  const t = useScopedI18n('home.problem');

  return (
    <section>
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-10">
          <div className="grid gap-12 md:grid-cols-2 md:items-start">
            {/* Header */}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                {t('label')}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                {t('title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {t('body')}
              </p>
            </div>

            {/* Testimonial */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-lg shadow-primary/10 sm:p-8">
              <Quote className="size-5 text-primary" />
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground italic">
                {t('quote')}
              </blockquote>
              <p className="mt-4 text-xs font-medium text-muted-foreground">
                {t('quoteAuthor')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
