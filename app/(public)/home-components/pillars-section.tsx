'use client';

import Link from 'next/link';
import { ArrowRight, Smartphone, Eye, MessageSquare, Cable } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import { Button } from '@/components/ui/button';

const PILLARS = [
  { key: 'claude', icon: Smartphone },
  { key: 'vm', icon: Eye },
  { key: 'chat', icon: MessageSquare },
  { key: 'tunnel', icon: Cable },
] as const;

export function PillarsSection() {
  const t = useScopedI18n('home.pillars');

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
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>

          {/* Cards */}
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.key}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/20 hover:bg-primary-muted hover:shadow-md hover:scale-[1.01]"
              >
                <pillar.icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {t(`${pillar.key}.title` as 'claude.title')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`${pillar.key}.body` as 'claude.body')}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12">
            <Link href="/workspace">
              <Button size="lg" className="gap-2">
                {t('cta')}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
