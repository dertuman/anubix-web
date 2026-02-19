import React from 'react';

import { HeroSection } from './home-components/hero-section';
import { LogosSection } from './home-components/logos-section';
import { ProblemSection } from './home-components/problem-section';
import { HowItWorksSection } from './home-components/how-it-works-section';
import { ScreenshotShowcase } from './home-components/screenshot-showcase';
import { DifferentiatorSection } from './home-components/differentiator-section';
import { FeaturesSection } from './home-components/features-section';
import { SocialProofSection } from './home-components/social-proof-section';
import { PatternsSection } from './home-components/patterns-section';
import { PricingSection } from './home-components/pricing-section';
import { FoundersSection } from './home-components/founders-section';
import { CtaSection } from './home-components/cta-section';

export default function HomePage() {
  return (
    <main className="w-full">
      <HeroSection />
      <LogosSection />
      <ProblemSection />
      <HowItWorksSection />
      <ScreenshotShowcase />
      <DifferentiatorSection />
      <FeaturesSection />
      <SocialProofSection />
      <PatternsSection />
      <PricingSection />
      <FoundersSection />
      <CtaSection />
    </main>
  );
}
