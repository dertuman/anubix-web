'use client';

import { useEffect } from 'react';
import axios from 'axios';

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `blog-view:${slug}`;
    // One view per slug per day per browser.
    const last = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
    if (last) return;
    window.sessionStorage.setItem(key, String(Date.now()));
    axios.post('/api/blog/stats', { type: 'view', slug }).catch(() => {
      /* best-effort */
    });
  }, [slug]);

  return null;
}
