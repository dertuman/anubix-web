'use client';

import { useScopedI18n } from '@/locales/client';
import { Sparkles } from 'lucide-react';

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

        {/* Demo video */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-primary/20 shadow-xl shadow-primary/5">
            <div className="relative aspect-video">
              <iframe
                src="https://www.youtube.com/embed/JYKj_fFyoAU?rel=0&modestbranding=1"
                title="Demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
