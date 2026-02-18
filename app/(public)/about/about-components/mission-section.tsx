'use client';

import { useScopedI18n } from '@/locales/client';

export function MissionSection() {
  const t = useScopedI18n('about.mission');

  return (
    <section className="border-t border-border">
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('title')}
          </h2>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
            <p>{t('description')}</p>
            <p>{t('description2')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
