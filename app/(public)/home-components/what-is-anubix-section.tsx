'use client';

export function WhatIsAnubixSection() {
  return (
    <section id="about" className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary-muted),transparent_50%)] opacity-25" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            What is Anubix?
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Pro-grade infrastructure. No setup required.
          </h2>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              The same agents, terminal, and file system that power tools like Cursor and Claude
              Code — running in the cloud so it works on every device. No installs. No local
              environment. Just open a browser and build.
            </p>
            <p>
              Used by senior engineers to ship production code. Accessible to anyone who can
              describe what they want.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
