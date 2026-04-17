import Link from 'next/link';
import { Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { BlogListItem } from '@/lib/blog-data';

export function BlogCard({ blog }: { blog: BlogListItem }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 transition hover:border-border hover:bg-card/70"
    >
      {blog.featured_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={blog.featured_image_url}
          alt={blog.featured_image_alt ?? blog.title}
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/10 to-primary/5" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">{blog.category}</Badge>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {blog.reading_time} min
          </span>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
          {blog.title}
        </h3>
        {blog.excerpt && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{blog.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
          {blog.author_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blog.author_avatar} alt="" className="size-5 rounded-full" />
          ) : null}
          <span>{blog.author_name}</span>
          {blog.published_at && (
            <>
              <span>·</span>
              <span>{new Date(blog.published_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
