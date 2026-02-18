import React from 'react';

import { HeroSection } from './home-components/hero-section';
import { LogosSection } from './home-components/logos-section';
import { FeaturesSection } from './home-components/features-section';
import { HowItWorksSection } from './home-components/how-it-works-section';
import { CtaSection } from './home-components/cta-section';

export default function HomePage() {
  return (
    <main className="w-full">
      <HeroSection />
      <LogosSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
    </main>
  );
}
