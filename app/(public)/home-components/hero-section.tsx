'use client';

import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { useUser } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PhoneFrame } from './device-frames';

export function HeroSection() {
  const t = useScopedI18n('home.hero');
  const tCommon = useScopedI18n('common');
  const { user } = useUser();

  return (
    <section className="relative w-full overflow-hidden">
      {/* Subtle noise texture overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--primary-muted),transparent_50%)] opacity-30" />

      <div className="relative container mx-auto flex flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-32 md:pt-40 md:pb-24">
        {user?.fullName && (
          <p className="text-muted-foreground mb-4 hidden text-sm sm:block">
            {tCommon('welcomeBack')}{' '}
            <span className="text-primary font-semibold">{user.fullName}</span>
          </p>
        )}

        {/* Badge -- hidden on mobile for tighter hero */}
        <div className="border-border bg-muted/50 text-muted-foreground mb-6 hidden items-center rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-sm sm:inline-flex">
          <span className="bg-primary mr-2 inline-block size-1.5 animate-pulse rounded-full" />
          {t('badge')}
        </div>

        {/* Headline */}
        <h1 className="text-foreground max-w-5xl text-[1.7rem] font-bold leading-tight tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          {t('title')}
          <br />
          <span className="from-primary to-primary/70 bg-linear-to-r bg-clip-text text-transparent">
            {t('titleHighlight')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-relaxed sm:text-xl">
          {t('subtitle')}
        </p>

        {/* CTA */}
        <div id="hero-cta" className="mt-10 flex flex-col items-center gap-4">
          <Link href="/workspace" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full gap-2 px-8 text-base sm:w-auto"
            >
              {t('cta')}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        {/* Footer text */}
        <p className="text-muted-foreground/70 mt-8 text-xs sm:text-sm">
          {t('footerText')}
        </p>

        {/* Product screenshot - phone mockups */}
        <div className="mt-16 flex items-end justify-center gap-6 sm:mt-20 sm:gap-10">
          {/* Code screenshot - primary */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-[200px] sm:w-[260px] md:w-[300px]">
              <PhoneFrame
                src="/screenshots/mobile-code.png"
                alt="Anubix code agent running a security review from a phone"
                width={1179}
                height={2556}
              />
            </div>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">Code</span>
          </div>
          {/* Chat screenshot - secondary, offset down */}
          <div className="flex flex-col items-center gap-3 translate-y-8 sm:translate-y-12">
            <div className="w-[180px] sm:w-[230px] md:w-[270px]">
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
    </section>
  );
}
