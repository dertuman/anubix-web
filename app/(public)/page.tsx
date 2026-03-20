import React from 'react';

import { HeroSection } from './home-components/hero-section';
import { LogoStrip } from './home-components/logo-strip';
import { WhoItsForSection } from './home-components/who-its-for-section';
import { ProblemSection } from './home-components/problem-section';
import { PillarsSection } from './home-components/pillars-section';
import { MobileHookSection } from './home-components/mobile-hook-section';
import { ComparisonSection } from './home-components/comparison-section';
import { PricingSection } from './home-components/pricing-section';
import { FaqSection } from './home-components/faq-section';
import { CtaSection } from './home-components/cta-section';
import { StickyMobileCta } from './home-components/sticky-mobile-cta';

export default function HomePage() {
  return (
    <main className="w-full">
      <HeroSection />
      <WhoItsForSection />
      <LogoStrip />
      <ProblemSection />
      <PillarsSection />
      <MobileHookSection />
      <ComparisonSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <StickyMobileCta />
    </main>
  );
}
