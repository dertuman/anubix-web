'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { useUser } from '@clerk/nextjs';
import { ArrowRight, Layers, Smartphone, Rocket } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function HeroSection() {
  const t = useScopedI18n('home.hero');
  const tCommon = useScopedI18n('common');
  const { user } = useUser();

  return (
    <section className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary-muted),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--primary-muted),transparent_40%)] opacity-50" />

      <div className="relative container mx-auto flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-12 text-center md:py-16">
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
            className="relative size-24 drop-shadow-lg sm:size-32"
          />
        </div>

        {/* Badge */}
        <div className="border-border bg-muted/50 text-muted-foreground mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
          <span className="bg-primary mr-2 inline-block size-1.5 animate-pulse rounded-full" />
          {t('badge')}
        </div>

        {/* Headline */}
        <h1 className="text-foreground max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          {t('title')}{' '}
          <span className="from-primary to-primary/70 bg-linear-to-r bg-clip-text text-transparent">
            {t('titleHighlight')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
          {t('subtitle')}
        </p>

        {/* CTAs */}
        <div id="hero-cta" className="mt-10 flex flex-col items-center gap-4">
          <Link href="/workspace" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full gap-2 px-8 text-base font-semibold sm:w-auto"
            >
              {t('cta')}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link
            href="/workspace?mode=chat"
            className="text-muted-foreground hover:text-primary text-sm transition-colors underline-offset-4 hover:underline"
          >
            or {t('ctaSecondary')} →
          </Link>
        </div>

        {/* Trust line */}
        <p className="text-muted-foreground/70 mt-5 text-xs sm:text-sm">
          {t('trustLine')}
        </p>

        {/* Stats bar */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {[
            { icon: Layers, label: t('stat1') },
            { icon: Smartphone, label: t('stat2') },
            { icon: Rocket, label: t('stat3') },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon className="size-4 text-primary" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
