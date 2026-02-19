import { MetadataRoute } from 'next';

import { API_BASE_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = API_BASE_URL || 'http://localhost:3000';

  // Public routes that should be indexed by search engines.
  // Auth pages (sign-in, sign-up) are excluded because they have noIndex set
  // and don't provide unique crawlable content for SEO.
  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: 'daily' | 'weekly' | 'monthly';
  }> = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/about', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/chat', priority: 0.9, changeFrequency: 'daily' },
    { path: '/code', priority: 0.7, changeFrequency: 'weekly' },
  ];

  const urls: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return urls;
}
