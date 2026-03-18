'use client';

import { FolderGit2, ImagePlus, Layers, Tablet, Mic, ScanEye } from 'lucide-react';

const DIFFERENTIATORS = [
  {
    icon: FolderGit2,
    title: 'Multi-repo access',
    description:
      'Work across multiple repositories in a single session. No switching, no context loss.',
  },
  {
    icon: ImagePlus,
    title: 'Drag-and-drop images',
    description:
      'Drop screenshots, mockups, and references straight into chat. Show the agent what you mean.',
  },
  {
    icon: Layers,
    title: 'Parallel sessions',
    description:
      'Every session is its own workspace. Run multiple agents without losing track of what\u2019s where.',
  },
  {
    icon: Tablet,
    title: 'Mobile & tablet',
    description:
      'A real terminal, file browser, and live preview on any screen size. Not a compromised mobile view \u2014 actual CLI power in your pocket.',
  },
  {
    icon: Mic,
    title: 'Voice input',
    description:
      'Wispr Flow-grade voice to text. 3x faster than typing on mobile. Dictate instructions, describe bugs, explain what you want built.',
  },
  {
    icon: ScanEye,
    title: 'Live preview',
    description:
      'See every file change in real time. Watch your app update as the agent builds.',
  },
] as const;

export function DifferentiatorsSection() {
  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,var(--primary-muted),transparent_50%)] opacity-25" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            What sets us apart
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            The details that matter.
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20 hover:bg-primary-muted"
            >
              <item.icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
