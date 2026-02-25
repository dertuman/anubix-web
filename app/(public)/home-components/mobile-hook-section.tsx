'use client';

import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { Smartphone, Monitor, Terminal, Globe, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const TOOLS = [
  {
    name: 'Cursor',
    desc: 'Desktop only',
    available: false,
    Icon: Monitor,
  },
  {
    name: 'Claude Code',
    desc: 'Needs a terminal',
    available: false,
    Icon: Terminal,
  },
  {
    name: 'Bolt',
    desc: 'Browser-only, not mobile-optimised',
    available: false,
    Icon: Globe,
  },
  {
    name: 'Anubix',
    desc: 'Built for any device',
    available: true,
    Icon: Smartphone,
  },
] as const;

export function MobileHookSection() {
  const t = useScopedI18n('home.mobileHook');

  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--primary-muted),transparent_50%)] opacity-40" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="grid gap-14 md:grid-cols-2 md:items-center">
          {/* Text column */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {t('label')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t('title')}
            </h2>
            <div className="mt-6 space-y-4">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('body')}
              </p>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('body2')}
              </p>
              <p className="text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                {t('body3')}
              </p>
            </div>
            <div className="mt-8">
              <Link href="/workspace?demo=true">
                <Button size="lg" className="gap-2 px-8 text-base font-semibold">
                  {t('cta')}
                  <Smartphone className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual: tool comparison cards */}
          <div className="grid grid-cols-2 gap-3">
            {TOOLS.map(({ name, desc, available, Icon }) => (
              <div
                key={name}
                className={`rounded-xl border p-4 transition-all ${
                  available
                    ? 'border-primary/30 bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border bg-card opacity-55'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg ${
                      available
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  {available ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary/15">
                      <Check className="size-3 text-primary" />
                    </div>
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full bg-muted">
                      <X className="size-3 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                <p
                  className={`text-sm font-semibold ${
                    available ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
