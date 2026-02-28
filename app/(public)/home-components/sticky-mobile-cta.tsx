'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroCta = document.getElementById('hero-cta');
    if (!heroCta) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(heroCta);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 md:hidden transition-all duration-300 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="rounded-2xl border border-primary/20 bg-background/90 p-2 shadow-2xl shadow-primary/20 backdrop-blur-sm">
        <Link href="/workspace" className="block">
          <Button
            size="lg"
            className="w-full gap-2 font-semibold"
          >
            Start building
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
