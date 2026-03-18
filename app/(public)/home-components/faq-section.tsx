'use client';

import { useState } from 'react';
import { useScopedI18n } from '@/locales/client';
import { ChevronDown } from 'lucide-react';

const FAQ_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export function FaqSection() {
  const t = useScopedI18n('home.faq');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = FAQ_KEYS.map((n) => ({
    q: t(`q${n}` as 'q1'),
    a: t(`a${n}` as 'a1'),
  }));

  return (
    <section>
      <div className="container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
        </div>

        {/* Accordion */}
        <div className="mx-auto mt-12 max-w-2xl space-y-2">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/30"
                  aria-expanded={isOpen}
                >
                  {item.q}
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {/* Animated content via CSS grid-rows trick */}
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-border px-5 pb-5 pt-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
