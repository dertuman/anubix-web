'use client';

import { Heart, Eye, Sparkles, Zap } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

const ICON_MAP = [Heart, Eye, Sparkles, Zap] as const;

const VALUE_KEYS = ['ownership', 'transparency', 'simplicity', 'modern'] as const;

export function ValuesSection() {
  const t = useScopedI18n('about.values');

  return (
    <section className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('title')}
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {VALUE_KEYS.map((key, i) => {
            const Icon = ICON_MAP[i];
            return (
              <div key={key} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t(`${key}.title` as 'ownership.title')}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t(`${key}.description` as 'ownership.description')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
