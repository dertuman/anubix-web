'use client';

import { useScopedI18n } from '@/locales/client';
import { Check, X } from 'lucide-react';

type CellValue = boolean | 'limited' | string;

const FEATURES = [
  'Build from phone',
  'Multi-model',
  'Real cloud VPS',
  'One-click deploy',
  'Bring your own key',
  'AI chat (non-coding)',
  'Pricing',
];

const TOOLS: { name: string; highlight: boolean; values: CellValue[] }[] = [
  {
    name: 'Anubix',
    highlight: true,
    values: [true, true, true, true, true, true, '$10/mo'],
  },
  {
    name: 'Cursor',
    highlight: false,
    values: [false, 'limited', 'Local only', false, true, false, '$20/mo min'],
  },
  {
    name: 'Bolt',
    highlight: false,
    values: ['limited', 'limited', 'Browser sandbox', true, false, false, '$25/mo min'],
  },
  {
    name: 'Lovable',
    highlight: false,
    values: [false, false, 'Browser sandbox', true, false, false, '$20/mo min'],
  },
];

function CellIcon({ value, highlight }: { value: CellValue; highlight: boolean }) {
  if (value === true) {
    return <Check className={`size-4 ${highlight ? 'text-primary' : 'text-primary/70'}`} />;
  }
  if (value === false) {
    return <X className="size-4 text-muted-foreground/30" />;
  }
  if (value === 'limited') {
    return <span className="text-xs font-medium text-muted-foreground">Limited</span>;
  }
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

export function ComparisonSection() {
  const t = useScopedI18n('home.comparison');

  return (
    <section>
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-10">
          {/* Header */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {t('label')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t('title')}
            </h2>
          </div>

          {/* Desktop table */}
          <div className="mt-12 hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    Feature
                  </th>
                  {TOOLS.map((tool) => (
                    <th
                      key={tool.name}
                      className={`p-4 text-center text-sm font-semibold ${
                        tool.highlight
                          ? 'bg-primary/5 text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {tool.highlight && (
                        <span className="mb-1 flex items-center justify-center gap-1 text-[10px] font-normal uppercase tracking-wider text-primary/60">
                          <Check className="size-3" /> Best pick
                        </span>
                      )}
                      {tool.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, rowIndex) => (
                  <tr key={feature} className="border-b border-border/50 last:border-0">
                    <td className="p-4 text-sm text-muted-foreground">{feature}</td>
                    {TOOLS.map((tool) => (
                      <td
                        key={tool.name}
                        className={`p-4 text-center ${
                          tool.highlight ? 'bg-primary/5' : ''
                        }`}
                      >
                        <CellIcon value={tool.values[rowIndex]} highlight={tool.highlight} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-12 space-y-4 md:hidden">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className={`rounded-xl border p-5 ${
                  tool.highlight
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${tool.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {tool.name}
                  </p>
                  {tool.highlight && (
                    <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-primary/60">
                      <Check className="size-3" /> Best pick
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-2.5">
                  {FEATURES.map((feature, i) => (
                    <div key={feature} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{feature}</span>
                      <CellIcon value={tool.values[i]} highlight={tool.highlight} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground/50">
            {t('note')}
          </p>
        </div>
      </div>
    </section>
  );
}
