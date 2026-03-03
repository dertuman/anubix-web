import React from 'react';

import { PromptHero } from './home-components/prompt-hero';
import { WhatIsAnubixSection } from './home-components/what-is-anubix-section';
import { CodeSection } from './home-components/code-section';
import { ChatSection } from './home-components/chat-section';
import { UnderTheHoodSection } from './home-components/under-the-hood-section';
import { AnyDeviceSection } from './home-components/any-device-section';
import { ProofSection } from './home-components/proof-section';
import { PricingSection } from './home-components/pricing-section';
import { FaqSection } from './home-components/faq-section';
import { CtaSection } from './home-components/cta-section';
import { StickyMobileCta } from './home-components/sticky-mobile-cta';

export default function HomePage() {
  return (
    <main className="w-full">
      <PromptHero />
      <WhatIsAnubixSection />
      <CodeSection />
      <ChatSection />
      <UnderTheHoodSection />
      <AnyDeviceSection />
      <ProofSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <StickyMobileCta />
    </main>
  );
}
