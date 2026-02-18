'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { useUser } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function HeroSection() {
  const t = useScopedI18n('home.hero');
  const tCommon = useScopedI18n('common');
  const { user } = useUser();

  return (
    <section className="relative w-full overflow-hidden">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary-muted),transparent_50%)]" />

      <div className="relative container mx-auto flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-20 text-center md:py-32">
        {/* Welcome back */}
        {user?.fullName && (
          <p className="text-muted-foreground mb-4 text-sm">
            {tCommon('welcomeBack')}{' '}
            <span className="text-primary font-semibold">{user.fullName}</span>
          </p>
        )}

        {/* Logo */}
        <div className="relative mb-8">
          <div className="bg-primary/10 pointer-events-none absolute inset-0 -m-4 rounded-full blur-2xl" />
          <Image
            src="/logo.webp"
            alt="Anubix"
            width={120}
            height={120}
            priority
            className="relative size-28 drop-shadow-lg sm:size-36"
          />
        </div>

        {/* Badge */}
        <div className="border-border bg-muted/50 text-muted-foreground mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
          <span className="bg-primary mr-2 inline-block size-1.5 rounded-full" />
          {t('badge')}
        </div>

        {/* Headline */}
        <h1 className="text-foreground max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          {t('title')}{' '}
          <span className="from-primary to-primary/70 bg-linear-to-r bg-clip-text text-transparent">
            {t('titleHighlight')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground mt-6 max-w-xl text-base sm:text-lg">
          {t('subtitle')}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2 px-8 text-base font-semibold">
              {t('cta')}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button
              variant="outline"
              size="lg"
              className="px-8 text-base font-semibold"
            >
              {t('ctaSecondary')}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
