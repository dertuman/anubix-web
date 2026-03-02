'use client';

export function ProofSection() {
  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-muted),transparent_60%)] opacity-30" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Built with Anubix
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            We use Anubix to build Anubix.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Not as a gimmick. Because it&apos;s the fastest way to ship.
          </p>
        </div>

        {/* Demo video */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-primary/20 shadow-xl shadow-primary/5">
            <div className="relative aspect-video">
              <iframe
                src="https://www.youtube.com/embed/JYKj_fFyoAU?rel=0&modestbranding=1"
                title="Demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
