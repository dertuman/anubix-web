'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function StickyMobileCta() {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="rounded-2xl border border-primary/20 bg-background/90 p-2 shadow-2xl shadow-primary/20 backdrop-blur-sm">
        <Link href="/sign-up" className="block">
          <Button
            size="lg"
            className="w-full gap-2 font-semibold"
          >
            Start building free
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
