import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Clock, Calendar, Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/constants';
import { generateDefaultMetadata } from '@/lib/metadata-utils';
import { getBlogBySlug, listPublishedBlogs } from '@/lib/blog-data';

import { ShareButtons } from '../components/share-buttons';
import { ViewTracker } from '../components/view-tracker';
import { BlogCard } from '../components/blog-card';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return generateDefaultMetadata({
      currentLocale: 'en',
      path: `/blog/${slug}`,
      translations: { title: 'Not found — Anubix Blog', description: 'Article not found.' },
      noIndex: true,
    });
  }

  const title = blog.meta_title ?? `${blog.title} — Anubix Blog`;
  const description = blog.meta_description ?? blog.excerpt ?? 'Read on the Anubix blog.';
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: `/blog/${slug}`,
    translations: {
      title,
      description,
      ogLocale: 'en',
      ogSiteName: 'Anubix',
      imageAlt: blog.og_image_alt ?? blog.featured_image_alt ?? blog.title,
      twitterSite: '@anubix',
    },
    keywords: blog.keywords,
    image: blog.featured_image_url
      ? {
          url: blog.featured_image_url,
          width: 1200,
          height: 630,
          alt: blog.og_image_alt ?? blog.featured_image_alt ?? blog.title,
        }
      : undefined,
  });
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) notFound();

  // Related: 3 most recent in the same category.
  const { blogs: relatedAll } = await listPublishedBlogs({ category: blog.category, limit: 4 });
  const related = relatedAll.filter((b) => b.slug !== blog.slug).slice(0, 3);

  const baseUrl = API_BASE_URL || 'http://localhost:3000';
  const canonical = `${baseUrl}/blog/${blog.slug}`;

  // Schema.org Article / BlogPosting structured data — helps Google render rich results.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.meta_description ?? blog.excerpt ?? undefined,
    image: blog.featured_image_url ? [blog.featured_image_url] : undefined,
    datePublished: blog.published_at ?? blog.created_at,
    dateModified: blog.updated_at,
    author: {
      '@type': 'Person',
      name: blog.author_name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Anubix',
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.webp` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: blog.keywords.join(', ') || undefined,
    articleSection: blog.category,
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
      <ViewTracker slug={blog.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to blog
      </Link>

      <article>
        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{blog.category}</Badge>
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {blog.published_at
                ? new Date(blog.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Draft'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {blog.reading_time} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {blog.views}
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-lg text-muted-foreground md:text-xl">{blog.excerpt}</p>
          )}

          <div className="flex items-center gap-3 border-y border-border/40 py-4">
            {blog.author_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blog.author_avatar} alt={blog.author_name} className="size-10 rounded-full" />
            ) : (
              <div className="size-10 rounded-full bg-primary/20" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{blog.author_name}</p>
              {blog.author_role && (
                <p className="text-xs text-muted-foreground">{blog.author_role}</p>
              )}
            </div>
            <ShareButtons slug={blog.slug} title={blog.title} url={canonical} />
          </div>
        </header>

        {blog.featured_image_url && (
          <figure className="my-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blog.featured_image_url}
              alt={blog.featured_image_alt ?? blog.title}
              className="w-full rounded-lg border border-border/60"
            />
            {blog.featured_image_caption && (
              <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                {blog.featured_image_caption}
              </figcaption>
            )}
          </figure>
        )}

        <div
          className="prose prose-invert prose-lg max-w-none prose-headings:font-display prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal prose-pre:rounded-lg prose-pre:border prose-pre:border-border/60"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {blog.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border/40 pt-6">
            {blog.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
          <p className="text-sm text-muted-foreground">
            Written by <span className="font-medium text-foreground">{blog.author_name}</span>
            {blog.author_bio && <span className="block text-xs">{blog.author_bio}</span>}
          </p>
          <ShareButtons slug={blog.slug} title={blog.title} url={canonical} />
        </div>
      </article>

      {/* ===== Anubix CTA ===== */}
      <aside className="mt-12 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-sm uppercase tracking-wide text-primary">Try Anubix</p>
        <h3 className="mt-2 font-display text-2xl font-semibold">
          Build production apps by talking to Claude Code
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          From your phone, tablet, or laptop. Real VPS. You own everything.
        </p>
        <Link
          href="/workspace"
          className="mt-4 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Open workspace
        </Link>
      </aside>

      {/* ===== Related ===== */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold">More in {blog.category}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <BlogCard key={r.id} blog={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
