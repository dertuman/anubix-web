'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface Candidate {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  pubDate: string | null;
  snippet: string;
  imageUrl: string | null;
}

interface AiNewsTabProps {
  onGenerated: (_blogId: string) => void;
}

export function AiNewsTab({ onGenerated }: AiNewsTabProps) {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyLink, setBusyLink] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get<{ candidates: Candidate[] }>('/api/admin/rss/candidates');
      setItems(res.data.candidates);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      toast({ title: 'Failed to load RSS candidates', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate(item: Candidate) {
    setBusyLink(item.link);
    try {
      const res = await axios.post<{ blogId: string }>('/api/admin/rss/generate', {
        sourceUrl: item.link,
        sourceTitle: item.title,
        sourceSnippet: item.snippet,
      });
      toast({ title: 'Draft created', description: item.title });
      setItems((prev) => prev.filter((i) => i.link !== item.link));
      onGenerated(res.data.blogId);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally {
      setBusyLink(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Click generate on any story. Search-grounded by Perplexity, humanized by GPT-4o, saved as draft.
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && items.length === 0 && <p className="text-sm text-muted-foreground">Fetching feeds…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No fresh candidates. Try again later.</p>
      )}

      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.link}
            className="flex items-start gap-3 rounded-md border border-border/60 bg-card/40 p-3 transition hover:border-border"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">{item.sourceName}</span>
                {item.pubDate && <span>· {new Date(item.pubDate).toLocaleDateString()}</span>}
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ml-auto flex items-center gap-1 hover:text-foreground"
                >
                  Source <ExternalLink className="size-3" />
                </a>
              </div>
              <h3 className="mt-1 text-sm font-medium leading-tight">{item.title}</h3>
              {item.snippet && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.snippet}</p>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => generate(item)}
              disabled={busyLink !== null}
              className="gap-1.5"
            >
              {busyLink === item.link ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
