import { Metadata } from 'next';

import { API_BASE_URL } from './constants';

type GenerateDefaultMetadataOptions = {
  currentLocale: string;
  path: string;
  translations: {
    title: string;
    description: string;
    ogLocale?: string;
    ogSiteName?: string;
    imageAlt?: string;
    twitterSite?: string;
  };
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  keywords?: string[];
  /**
   * When true, instructs search engines not to index this page.
   * Useful for auth pages, portals, and other private routes.
   */
  noIndex?: boolean;
};

/**
 * Generates comprehensive metadata optimised for:
 * - Google / Search Engines (title, description, canonical, structured data)
 * - Discord embeds (og:title, og:description, og:image — Discord reads OG tags)
 * - WhatsApp previews (og:title, og:description, og:image — needs ≥300×200 image)
 * - Twitter/X cards (twitter:card, twitter:title, twitter:image)
 * - iMessage & Slack previews (og: tags)
 *
 * Key requirements for rich previews:
 * - og:image must be an absolute URL (not relative)
 * - og:image dimensions: 1200×630 is the universal sweet spot
 * - Discord requires og:type and og:url to render embeds
 * - WhatsApp requires images ≥300×200 and prefers ≤300KB
 * - Title should be ≤60 chars, description ≤155 chars for best display
 */
export function generateDefaultMetadata({
  currentLocale,
  path,
  translations,
  keywords = [],
  image,
  noIndex = false,
}: GenerateDefaultMetadataOptions): Metadata {
  const baseUrl = API_BASE_URL || 'http://localhost:3000';
  const normalizedPath = path === '/' ? '' : path.replace(/\/$/, '');
  const canonical = `${baseUrl}${normalizedPath}`;

  // Use the dynamically generated OG image from /opengraph-image when no custom image is provided.
  // This ensures an absolute URL is always available (critical for Discord & WhatsApp).
  const ogImage = image
    ? {
        url: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`,
        width: image.width || 1200,
        height: image.height || 630,
        alt: image.alt || translations.imageAlt || translations.title,
        type: 'image/png',
      }
    : {
        url: `${baseUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: translations.imageAlt || translations.title,
        type: 'image/png',
      };

  return {
    metadataBase: new URL(baseUrl),
    title: translations.title,
    description: translations.description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    authors: [{ name: 'Anubix', url: baseUrl }],
    creator: 'Anubix',
    publisher: 'Anubix',
    applicationName: 'Anubix',
    generator: 'Next.js',
    referrer: 'origin-when-cross-origin',
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
    }),
    alternates: {
      canonical,
    },
    // Open Graph — used by Discord, WhatsApp, Slack, iMessage, Facebook, LinkedIn
    openGraph: {
      type: 'website',
      locale: translations.ogLocale || currentLocale,
      url: canonical,
      siteName: translations.ogSiteName || 'Anubix',
      title: translations.title,
      description: translations.description,
      images: [ogImage],
    },
    // Twitter/X — falls back to OG tags if not set, but explicit is better
    twitter: {
      card: 'summary_large_image',
      site: translations.twitterSite || '@anubix',
      creator: translations.twitterSite || '@anubix',
      title: translations.title,
      description: translations.description,
      images: [ogImage],
    },
  };
}
