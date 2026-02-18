import React from 'react';

import { AboutHero } from './about-components/about-hero';
import { MissionSection } from './about-components/mission-section';
import { ValuesSection } from './about-components/values-section';
import { StackSection } from './about-components/stack-section';
import { AboutCta } from './about-components/about-cta';

export const metadata = {
  title: 'About — Anubix',
  description:
    'Anubix turns conversations into deployed web apps. Learn about our mission, principles, and the technology stack behind the platform.',
};

export default function AboutPage() {
  return (
    <main className="w-full">
      <AboutHero />
      <MissionSection />
      <ValuesSection />
      <StackSection />
      <AboutCta />
    </main>
  );
}
