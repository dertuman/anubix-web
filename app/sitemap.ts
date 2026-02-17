import { MetadataRoute } from 'next';

import { API_BASE_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = API_BASE_URL || 'http://localhost:3000';

  // Public routes that should be indexed
  const routes = ['', '/sign-in', '/sign-up'];

  const urls: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return urls;
}
