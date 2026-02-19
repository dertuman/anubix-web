import { API_BASE_URL } from '@/lib/constants';

/**
 * JSON-LD structured data for rich Google search results, knowledge panels,
 * and enhanced SERP features.
 *
 * Includes:
 * - Organization schema (brand identity, logo, social links)
 * - WebSite schema (site-level search action)
 * - SoftwareApplication schema (app listing in search)
 */
export function JsonLd() {
  const baseUrl = API_BASE_URL || 'http://localhost:3000';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Anubix',
    url: baseUrl,
    logo: `${baseUrl}/logo.webp`,
    description:
      'Production at the speed of thought. Terminal power, beautiful interface. Claude Code, GPT, and Gemini in one app.',
    sameAs: ['https://twitter.com/anubix'],
    foundingDate: '2024',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${baseUrl}/about`,
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Anubix',
    url: baseUrl,
    description:
      "Claude Code, GPT, and Gemini in one app. Build real software from your browser or your phone. You're in control.",
    publisher: {
      '@type': 'Organization',
      name: 'Anubix',
    },
  };

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Anubix',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description:
      "Terminal power, beautiful interface. A real coding agent with Claude Code, GPT, and Gemini. Build real software from any device. You're in control.",
    url: baseUrl,
    offers: {
      '@type': 'Offer',
      category: 'free',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareAppSchema),
        }}
      />
    </>
  );
}
