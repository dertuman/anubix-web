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
};

export function generateDefaultMetadata({
  currentLocale,
  path,
  translations,
  keywords = [],
  image = {
    url: 'https://via.placeholder.com/300x300/6366f1/ffffff?text=Profile',
    width: 1200,
    height: 630,
    alt: 'Profile',
  },
}: GenerateDefaultMetadataOptions): Metadata {
  const baseUrl = API_BASE_URL || 'http://localhost:3000';
  const normalizedPath = path === '/' ? '' : path.replace(/\/$/, '');
  const canonical = `${baseUrl}${normalizedPath}`;

  return {
    metadataBase: new URL(baseUrl),
    title: translations.title,
    description: translations.description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      locale: translations.ogLocale || currentLocale,
      url: canonical,
      siteName: translations.ogSiteName || 'PROJECT',
      title: translations.title,
      description: translations.description,
      images: [
        {
          url: image.url,
          width: image.width || 1200,
          height: image.height || 630,
          alt: image.alt || translations.imageAlt || translations.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: translations.twitterSite || '@PROJECT',
      title: translations.title,
      description: translations.description,
      images: [
        {
          url: image.url,
          width: image.width || 1200,
          height: image.height || 630,
          alt: image.alt || translations.imageAlt || translations.title,
        },
      ],
    },
  };
}
