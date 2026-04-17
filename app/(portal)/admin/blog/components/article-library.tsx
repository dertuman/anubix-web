'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Eye, Star, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/ai/types';
import { toast } from '@/components/ui/use-toast';

export interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  featured_image_url: string | null;
  featured: boolean;
  is_draft: boolean;
  published_at: string | null;
  views: number;
  likes: number;
  author_name: string;
  updated_at: string;
}

interface ArticleLibraryProps {
  onEdit: (_id: string) => void;
  refreshKey: number;
}

export function ArticleLibrary({ onEdit, refreshKey }: ArticleLibraryProps) {
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BlogCategory | ''>('');
  const [status, setStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, status, refreshKey]);

  async function fetchBlogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (status !== 'all') params.set('status', status);
      const res = await axios.get<{ blogs: BlogListItem[] }>(`/api/admin/blog/list?${params.toString()}`);
      setBlogs(res.data.blogs);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed to load';
      toast({ title: 'Failed to load library', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    try {
      await axios.delete(`/api/admin/blog/delete?id=${id}`);
      toast({ title: 'Deleted', description: title });
      void fetchBlogs();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      toast({ title: 'Delete failed', description: msg, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as BlogCategory | '')}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {BLOG_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex gap-1 rounded-md border border-input p-1">
          {(['all', 'draft', 'published'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded px-3 py-1 text-xs capitalize ${
                status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && blogs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-12 text-center">
          <FileText className="mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No articles yet.</p>
        </div>
      )}

      <div className="grid gap-3">
        {blogs.map((b) => (
          <div
            key={b.id}
            className="flex items-start gap-3 rounded-md border border-border/60 bg-card/40 p-3 transition hover:border-border"
          >
            {b.featured_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.featured_image_url} alt="" className="h-16 w-24 flex-shrink-0 rounded object-cover" />
            ) : (
              <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-medium">{b.title}</h3>
                {b.featured && <Star className="size-3 text-yellow-500" />}
                {b.is_draft ? (
                  <Badge variant="outline" className="text-[10px]">Draft</Badge>
                ) : (
                  <Badge className="text-[10px]">Published</Badge>
                )}
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">{b.excerpt ?? '—'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>{b.category}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Eye className="size-3" /> {b.views}</span>
                <span>·</span>
                <span>{new Date(b.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => onEdit(b.id)}>
                <Edit2 className="size-3" /> Edit
              </Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-destructive" onClick={() => handleDelete(b.id, b.title)}>
                <Trash2 className="size-3" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
