'use client';

import { Terminal, Rocket } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

const AUDIENCES = [
  { key: 'dev', icon: Terminal },
  { key: 'vibe', icon: Rocket },
] as const;

export function WhoItsForSection() {
  const t = useScopedI18n('home.whoItsFor');

  return (
    <section>
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-10">
          {/* Header */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {t('label')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t('title')}
            </h2>
          </div>

          {/* Cards */}
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:max-w-none">
            {AUDIENCES.map((audience) => (
              <div
                key={audience.key}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/20 hover:bg-primary-muted hover:shadow-md hover:scale-[1.01]"
              >
                <audience.icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {t(`${audience.key}.title` as 'dev.title')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`${audience.key}.body` as 'dev.body')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
