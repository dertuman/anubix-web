'use client';

import { Monitor, Smartphone, Tablet } from 'lucide-react';

export function AnyDeviceSection() {
  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--primary-muted),transparent_50%)] opacity-20" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Any device
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Your phone is just as powerful as your laptop. Because neither one is doing the work.
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Everything runs in the cloud. Your device is just the window. Start on your phone,
            pick up on your laptop — same project, same environment, nothing to sync.
          </p>

          {/* Device icons */}
          <div className="mt-12 flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
              <Smartphone className="size-8" />
              <span className="text-xs">Phone</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
              <Tablet className="size-8" />
              <span className="text-xs">Tablet</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
              <Monitor className="size-8" />
              <span className="text-xs">Laptop</span>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground/50">
            Same environment. Same project. Any device.
          </p>
        </div>
      </div>
    </section>
  );
}
