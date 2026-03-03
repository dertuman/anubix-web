'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ChatSection() {
  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--primary-muted),transparent_50%)] opacity-25" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Chat
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Every AI. One conversation.
          </h2>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              Every leading model in one app. Switch mid-conversation with one tap — Claude,
              GPT, Gemini, Perplexity, DALL-E, Flux, and hundreds more. Or let Anubix auto-route
              to the best model for each task.
            </p>
            <p className="font-medium text-foreground">
              One app. One credit balance. Hundreds of models.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-10">
            <Link href="/workspace?mode=chat">
              <Button variant="outline" size="lg" className="gap-2">
                Start chatting free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
