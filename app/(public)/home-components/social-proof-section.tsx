'use client';

import { useScopedI18n } from '@/locales/client';
import { Quote, Sparkles } from 'lucide-react';

export function SocialProofSection() {
  const t = useScopedI18n('home.socialProof');

  return (
    <section className="relative border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body')}
          </p>
        </div>

        {/* Built with Anubix badge */}
        <div className="mx-auto mt-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            Built with Anubix
          </div>
        </div>

        {/* Quote */}
        <div className="mx-auto mt-12 max-w-xl">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-muted),transparent_70%)]" />
            <div className="relative">
              <Quote className="mx-auto mb-4 size-8 text-primary/30" />
              <blockquote className="text-lg font-medium leading-relaxed text-foreground sm:text-xl">
                &ldquo;{t('quote')}&rdquo;
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground">
                &mdash; {t('quoteAuthor')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
