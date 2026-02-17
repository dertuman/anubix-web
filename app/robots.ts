import { MetadataRoute } from 'next';

import { API_BASE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = API_BASE_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
