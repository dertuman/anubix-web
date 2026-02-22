'use client';

import { useScopedI18n } from '@/locales/client';
import { Sparkles, Play } from 'lucide-react';

export function SocialProofSection() {
  const t = useScopedI18n('home.socialProof');

  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-muted),transparent_60%)] opacity-30" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            {t('label')}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('body')}
          </p>
        </div>

        {/* Demo video placeholder */}
        <div className="mx-auto mt-12 max-w-2xl">
          <div className="group relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-primary/5 transition-colors hover:border-primary/50 hover:bg-primary/8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-muted),transparent_70%)]" />
            <div className="relative text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Play className="size-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t('videoPlaceholder')}
              </p>
              <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                {t('videoSubtext')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
