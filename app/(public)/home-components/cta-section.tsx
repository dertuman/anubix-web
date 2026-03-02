'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="border-t border-border">
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card p-8 text-center sm:p-12 md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-muted),transparent_70%)]" />

          <div className="relative">
            <h2 className="text-2xl tracking-tight text-foreground sm:text-3xl md:text-4xl">
              You&apos;ve outgrown the sandbox. This is what&apos;s next.
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              A real dev environment. Any AI model. Any device. Yours.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/workspace?mode=chat">
                <Button variant="outline" size="lg" className="gap-2">
                  Start with Chat free
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/workspace?mode=code">
                <Button size="lg" className="gap-2">
                  Unlock Code - &euro;10
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground/70 sm:text-sm">
              Less than the cost of one month of any other tool.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
