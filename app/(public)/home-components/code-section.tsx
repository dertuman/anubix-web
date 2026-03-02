'use client';

import Link from 'next/link';
import { ArrowRight, Cloud, Eye, Cpu, Rocket, FolderTree, Terminal, Key } from 'lucide-react';

import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Cloud,
    title: 'Cloud agents',
    description: 'Real AI coding agents running in a cloud VPS, not browser sandboxes.',
  },
  {
    icon: Eye,
    title: 'Live preview',
    description: 'See changes as the agent builds, from any device.',
  },
  {
    icon: Cpu,
    title: 'Any AI model',
    description: 'Claude, GPT, Gemini, and hundreds more via OpenRouter. Switch mid-build.',
  },
  {
    icon: Rocket,
    title: 'One-click deploy',
    description: 'Push to Vercel, push to GitHub, ship from your phone.',
  },
  {
    icon: FolderTree,
    title: 'Multi-file awareness',
    description: 'The agent understands your whole project, not just one file.',
  },
  {
    icon: Terminal,
    title: 'Terminal access',
    description: 'Real terminal commands, dependency management, debugging.',
  },
  {
    icon: Key,
    title: 'Bring your own key',
    description: 'Connect your existing Claude or OpenAI API key. You pay your provider, we provide the environment.',
  },
] as const;

export function CodeSection() {
  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--primary-muted),transparent_50%)] opacity-25" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Code
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            A real dev environment you talk to.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Describe what you want. Anubix spins up a cloud coding agent with file system access,
            terminal, dependency management, and debugging. Watch it work in real time. Guide it
            through conversation. Step in when you need to.
          </p>
        </div>

        {/* Feature blocks */}
        <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20 hover:bg-primary-muted"
            >
              <feature.icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">{feature.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mx-auto mt-12 max-w-3xl">
          <Link href="/workspace?mode=code">
            <Button size="lg" className="gap-2">
              Start building - &euro;10
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
