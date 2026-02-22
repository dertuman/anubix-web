'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import { Button } from '@/components/ui/button';

export function CtaSection() {
  const t = useScopedI18n('home.cta');

  return (
    <section className="border-t border-border">
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card p-8 text-center sm:p-12 md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-muted),transparent_70%)]" />

          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t('title')}
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {t('subtitle')}
            </p>
            <div className="mt-8">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="gap-2 px-8 text-base font-semibold"
                >
                  {t('button')}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground/70 mt-4 text-xs sm:text-sm">
              {t('trustLine')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
