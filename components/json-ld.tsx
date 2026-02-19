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
      'Anubix turns conversations into deployed web apps. Build apps by talking — no code required.',
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
      'Describe what you want. Anubix builds it, deploys it, and hands you the keys. No code required.',
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
      'Build and deploy web apps by talking. Anubix is an AI-powered no-code platform that turns conversations into deployed applications.',
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
