'use client';

const COMPARISON_ROWS = [
  { label: 'Architecture', simple: 'Browser sandbox', dev: 'Local machine', anubix: 'Cloud VPS' },
  { label: 'Scope', simple: 'Single-file focus', dev: 'Full environment', anubix: 'Full environment' },
  { label: 'Devices', simple: 'Any device', dev: 'Desktop only', anubix: 'Any device' },
  { label: 'Complexity', simple: 'Limited', dev: 'Unlimited', anubix: 'Unlimited' },
  { label: 'Interface', simple: 'Conversational', dev: 'Terminal / IDE', anubix: 'Conversational' },
  { label: 'Models', simple: 'One model', dev: 'One model (usually)', anubix: 'Any model' },
] as const;

export function UnderTheHoodSection() {
  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-muted),transparent_60%)] opacity-20" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Under the hood
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything runs in the cloud. That&apos;s the difference.
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            AI coding tools make trade-offs. Here&apos;s how they compare.
          </p>
        </div>

        {/* Comparison table */}
        <div className="mx-auto mt-14 max-w-3xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  &nbsp;
                </th>
                <th className="pb-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Simple builders
                </th>
                <th className="pb-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Developer tools
                </th>
                <th className="pb-3 pl-4 text-left text-xs font-medium uppercase tracking-wider text-primary">
                  Anubix
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-3 pr-4 text-xs font-medium text-muted-foreground">
                    {row.label}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{row.simple}</td>
                  <td className="py-3 px-4 text-muted-foreground">{row.dev}</td>
                  <td className="py-3 pl-4 font-medium text-foreground">{row.anubix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
