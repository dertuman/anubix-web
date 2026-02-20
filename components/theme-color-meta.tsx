'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Dynamically sets <meta name="theme-color"> based on the active theme.
 * Dark → #09090b (matches bg-background in dark mode)
 * Light → #ffffff
 */
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === 'dark' ? '#09090b' : '#ffffff';
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [resolvedTheme]);

  return null;
}
