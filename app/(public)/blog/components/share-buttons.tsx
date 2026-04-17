'use client';

import { Linkedin, Twitter, Link2, Facebook } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface ShareButtonsProps {
  slug: string;
  title: string;
  url: string;
}

export function ShareButtons({ slug, title, url }: ShareButtonsProps) {
  const [shared, setShared] = useState(false);

  async function recordShare() {
    if (shared) return;
    setShared(true);
    try {
      await axios.post('/api/blog/stats', { type: 'share', slug });
    } catch {
      // Best-effort.
    }
  }

  function openShare(target: string) {
    void recordShare();
    const params = new URLSearchParams({ url, text: title });
    let shareUrl = '';
    if (target === 'twitter') shareUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
    if (target === 'linkedin') shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    if (target === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied' });
      void recordShare();
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Share:</span>
      <Button size="sm" variant="outline" onClick={() => openShare('twitter')} className="h-8 w-8 p-0">
        <Twitter className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => openShare('linkedin')} className="h-8 w-8 p-0">
        <Linkedin className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => openShare('facebook')} className="h-8 w-8 p-0">
        <Facebook className="size-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={copyLink} className="h-8 w-8 p-0">
        <Link2 className="size-4" />
      </Button>
    </div>
  );
}
