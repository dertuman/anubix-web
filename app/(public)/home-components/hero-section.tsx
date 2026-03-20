'use client';

import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { useUser } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';

import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { PhoneFrame } from './device-frames';

export function HeroSection() {
  const t = useScopedI18n('home.hero');
  const tCommon = useScopedI18n('common');
  const { user } = useUser();

  return (
    <section className="relative w-full overflow-hidden">
      {/* Grid background -- centered on logo position */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          backgroundPosition: 'center 0',
        }}
      />
      {/* Radial fade so grid dissolves toward edges */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_20%,var(--background)_60%)]" />
      {/* Soft ambient green glow -- mobile only */}
      <div className="pointer-events-none absolute -top-1/4 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-[120px] lg:hidden" />

      {/* Stacked centered layout: mobile + tablet */}
      <div className="relative container mx-auto flex flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-32 lg:hidden">
        {/* Fox logo */}
        <Image
          src="/logo.webp"
          alt="Anubix logo"
          width={120}
          height={120}
          className="mb-6 size-20 sm:size-24"
          priority
        />

        {user?.fullName && (
          <p className="text-muted-foreground mb-4 hidden text-sm sm:block">
            {tCommon('welcomeBack')}{' '}
            <span className="text-primary font-semibold">{user.fullName}</span>
          </p>
        )}

        {/* Badge */}
        <div className="border-border bg-muted/50 text-muted-foreground mb-6 hidden items-center rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-sm sm:inline-flex">
          <span className="bg-primary mr-2 inline-block size-1.5 animate-pulse rounded-full" />
          {t('badge')}
        </div>

        <h1 className="text-foreground max-w-5xl text-[1.7rem] font-bold leading-tight tracking-tighter sm:text-5xl md:text-6xl">
          {t('title')}
          <br />
          <span className="from-primary to-primary/70 bg-linear-to-r bg-clip-text text-transparent">
            {t('titleHighlight')}
          </span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-relaxed sm:text-xl">
          {t('subtitle')}
        </p>

        <div id="hero-cta" className="mt-10 flex flex-col items-center gap-4">
          <Link href="/workspace" className="w-full sm:w-auto">
            <Button size="lg" className="w-full gap-2 px-8 text-base sm:w-auto">
              {t('cta')}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <p className="text-muted-foreground/70 mt-8 text-xs sm:text-sm">
          {t('footerText')}
        </p>

        {/* Phone mockups -- stacked centered */}
        <div className="mt-16 flex items-end justify-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-[200px] sm:w-[260px] md:w-[280px]">
              <PhoneFrame
                src="/screenshots/mobile-code.png"
                alt="Anubix code agent running a security review from a phone"
                width={1179}
                height={2556}
              />
            </div>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">Code</span>
          </div>
          <div className="flex flex-col items-center gap-3 translate-y-8 sm:translate-y-12">
            <div className="w-[180px] sm:w-[230px] md:w-[250px]">
              <PhoneFrame
                src="/screenshots/mobile-chat.png"
                alt="Anubix AI chat with Gemini comparing React patterns"
                width={1179}
                height={2556}
              />
            </div>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">Chat</span>
          </div>
        </div>
      </div>

      {/* Desktop layout: text left, phones right (Warp-style) */}
      <div className="relative container mx-auto hidden px-4 pt-24 pb-16 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12 xl:pt-28 xl:pb-20 xl:gap-16">
        {/* Left column -- text */}
        <div>
          <Image
            src="/logo.webp"
            alt="Anubix logo"
            width={80}
            height={80}
            className="mb-5 size-16 lg:size-20"
            priority
          />

          {user?.fullName && (
            <p className="text-muted-foreground mb-3 text-sm">
              {tCommon('welcomeBack')}{' '}
              <span className="text-primary font-semibold">{user.fullName}</span>
            </p>
          )}

          <div className="border-border bg-muted/50 text-muted-foreground mb-5 inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
            <span className="bg-primary mr-2 inline-block size-1.5 animate-pulse rounded-full" />
            {t('badge')}
          </div>

          <h1 className="text-foreground text-4xl font-bold leading-tight tracking-tighter lg:text-6xl">
            {t('title')}
            <br />
            <span className="from-primary to-primary/70 bg-linear-to-r bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </h1>

          <p className="text-muted-foreground mt-5 max-w-lg text-lg leading-relaxed lg:text-xl">
            {t('subtitle')}
          </p>

          <div id="hero-cta" className="mt-8 flex items-center gap-4">
            <Link href="/workspace">
              <Button size="lg" className="gap-2 px-8 text-base">
                {t('cta')}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          <p className="text-muted-foreground/70 mt-6 text-sm">
            {t('footerText')}
          </p>
        </div>

        {/* Right column -- single phone */}
        <div className="w-[260px] xl:w-[300px]">
          <PhoneFrame
            src="/screenshots/mobile-code.png"
            alt="Anubix code agent running a security review from a phone"
            width={1179}
            height={2556}
          />
        </div>
      </div>
    </section>
  );
}
