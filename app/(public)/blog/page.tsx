import Link from 'next/link';
import type { Metadata } from 'next';

import { generateDefaultMetadata } from '@/lib/metadata-utils';
import { listPublishedBlogs } from '@/lib/blog-data';

import { BlogCard } from './components/blog-card';
import { BlogFilters } from './components/blog-filters';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface BlogPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const category = sp.category;

  const title = category
    ? `${category} — Anubix Blog`
    : 'Anubix Blog — AI coding, product updates, and tutorials';
  const description = category
    ? `Articles on ${category.toLowerCase()} from the Anubix team. AI coding techniques, tutorials, and honest takes.`
    : 'Essays, tutorials, and product updates from Anubix. How to build production apps by talking to Claude Code — from any device.';

  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/blog',
    translations: {
      title,
      description,
      ogLocale: 'en',
      ogSiteName: 'Anubix',
      imageAlt: 'Anubix Blog — AI coding, builds, tutorials',
      twitterSite: '@anubix',
    },
    keywords: [
      'Anubix blog',
      'AI coding',
      'AI app builder',
      'Claude Code tutorials',
      'Gemini 3 Pro',
      'build apps from phone',
      'no-code AI',
      'cloud IDE',
    ],
  });
}

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? '1'));
  const limit = 12;
  const { blogs, total } = await listPublishedBlogs({
    search: sp.search,
    category: sp.category,
    limit,
    offset: (page - 1) * limit,
  });

  const featured = blogs.filter((b) => b.featured);
  const rest = blogs.filter((b) => !b.featured);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <header className="mb-10 space-y-4 border-b border-border/50 pb-10">
        <p className="text-sm uppercase tracking-wider text-primary">Anubix Blog</p>
        <h1 className="font-display text-4xl font-bold md:text-5xl">
          AI coding, in the open.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Tutorials, product updates, and opinionated takes on where AI-assisted development is going — from the team building the VPS-powered AI coding platform.
        </p>
      </header>

      <BlogFilters />

      {blogs.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No articles yet. Check back soon.</p>
        </div>
      ) : (
        <>
          {featured.length > 0 && page === 1 && (
            <section className="mt-10">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Featured</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {featured.map((b) => (
                  <BlogCard key={b.id} blog={b} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            {featured.length > 0 && page === 1 && (
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">All articles</h2>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(page === 1 ? rest : blogs).map((b) => (
                <BlogCard key={b.id} blog={b} />
              ))}
            </div>
          </section>

          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const params = new URLSearchParams();
                if (sp.search) params.set('search', sp.search);
                if (sp.category) params.set('category', sp.category);
                if (p > 1) params.set('page', String(p));
                return (
                  <Link
                    key={p}
                    href={`/blog${params.toString() ? `?${params.toString()}` : ''}`}
                    className={`rounded-md border px-3 py-1 text-sm ${
                      p === page ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
