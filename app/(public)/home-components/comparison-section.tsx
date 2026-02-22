'use client';

import { useScopedI18n } from '@/locales/client';
import { Check, X } from 'lucide-react';

type CellValue = boolean | 'limited' | string;

const FEATURES = [
  'Build from phone',
  'Multi-model (100+)',
  'Real cloud VPS',
  'One-click deploy',
  'Bring your own key',
  'AI chat (non-coding)',
  'Pay as you go',
];

const TOOLS: { name: string; highlight: boolean; values: CellValue[] }[] = [
  {
    name: 'Anubix',
    highlight: true,
    values: [true, true, true, true, true, true, true],
  },
  {
    name: 'Cursor',
    highlight: false,
    values: [false, 'limited', 'Local only', false, true, false, '✗ $20/mo min'],
  },
  {
    name: 'Bolt',
    highlight: false,
    values: ['limited', 'limited', 'Browser sandbox', true, false, false, '✗ $25/mo min'],
  },
  {
    name: 'Lovable',
    highlight: false,
    values: [false, false, 'Browser sandbox', true, false, false, '✗ $20/mo min'],
  },
];

function Cell({ value, highlight }: { value: CellValue; highlight: boolean }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <Check className={`size-5 ${highlight ? 'text-primary' : 'text-primary/70'}`} />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <X className="size-5 text-muted-foreground/30" />
      </div>
    );
  }
  if (value === 'limited') {
    return (
      <span className="text-xs font-medium text-muted-foreground">Limited</span>
    );
  }
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

export function ComparisonSection() {
  const t = useScopedI18n('home.comparison');

  return (
    <section className="relative border-t border-border bg-muted/30">
      <div className="relative container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
        </div>

        {/* Table */}
        <div className="mx-auto mt-12 max-w-4xl overflow-x-auto rounded-xl border border-border">
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
                      <span className="mb-1 block text-[10px] font-normal uppercase tracking-wider text-primary/60">
                        ✓ Best pick
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
                      <Cell value={tool.values[rowIndex]} highlight={tool.highlight} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-muted-foreground/50">
          {t('note')}
        </p>
      </div>
    </section>
  );
}
