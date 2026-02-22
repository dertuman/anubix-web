import React from 'react';

import { HeroSection } from './home-components/hero-section';
import { ScreenshotShowcase } from './home-components/screenshot-showcase';
import { MobileHookSection } from './home-components/mobile-hook-section';
import { MultiModelSection } from './home-components/multi-model-section';
import { DifferentiatorSection } from './home-components/differentiator-section';
import { ComparisonSection } from './home-components/comparison-section';
import { SocialProofSection } from './home-components/social-proof-section';
import { PricingSection } from './home-components/pricing-section';
import { FaqSection } from './home-components/faq-section';
import { CtaSection } from './home-components/cta-section';
import { StickyMobileCta } from './home-components/sticky-mobile-cta';

export default function HomePage() {
  return (
    <main className="w-full">
      <HeroSection />
      <ScreenshotShowcase />
      <MobileHookSection />
      <MultiModelSection />
      <DifferentiatorSection />
      <ComparisonSection />
      <SocialProofSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <StickyMobileCta />
    </main>
  );
}
