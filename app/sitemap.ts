import { MetadataRoute } from 'next';

import { API_BASE_URL } from '@/lib/constants';
import { listAllPublishedSlugs } from '@/lib/blog-data';

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
    { path: '/workspace', priority: 0.9, changeFrequency: 'daily' },
    { path: '/blog', priority: 0.9, changeFrequency: 'daily' },
  ];

  const urls: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Append published blog posts so Google can crawl them.
  try {
    const blogs = await listAllPublishedSlugs();
    for (const b of blogs) {
      urls.push({
        url: `${baseUrl}/blog/${b.slug}`,
        lastModified: new Date(b.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch {
    // If Supabase isn't reachable at build time, fall back silently.
  }

  return urls;
}
