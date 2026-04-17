'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { BLOG_CATEGORIES } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

export function BlogFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const currentCategory = params.get('category');
  const currentSearch = params.get('search') ?? '';
  const [search, setSearch] = useState(currentSearch);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (search.trim()) next.set('search', search.trim());
    else next.delete('search');
    next.delete('page');
    router.push(`/blog?${next.toString()}`);
  }

  function categoryHref(cat: string | null): string {
    const next = new URLSearchParams(params.toString());
    if (cat) next.set('category', cat);
    else next.delete('category');
    next.delete('page');
    return `/blog?${next.toString()}`;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="pl-9"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        <Link
          href={categoryHref(null)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition',
            !currentCategory
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
          )}
        >
          All
        </Link>
        {BLOG_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={categoryHref(cat)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition',
              currentCategory === cat
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
          >
            {cat}
          </Link>
        ))}
      </div>
    </div>
  );
}
