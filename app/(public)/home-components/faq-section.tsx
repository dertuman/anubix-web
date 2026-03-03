'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'How is this different from Bolt or Lovable?',
    a: 'Bolt and Lovable run in browser sandboxes. They\u2019re great for landing pages and simple apps, but they hit a ceiling fast. Anubix runs a full coding agent in a cloud VPS with real file system access, terminal commands, and multi-file awareness. It handles the complexity that sandbox tools can\u2019t. And you can use any AI model, not just one.',
  },
  {
    q: 'How is this different from Cursor or Claude Code?',
    a: 'Cursor and Claude Code are powerful developer tools, but they require a desktop and a certain level of technical knowledge. Anubix gives you that same infrastructure through a conversational interface. And because everything runs in the cloud, you can access it from any device, including your phone.',
  },
  {
    q: 'Can I really code from my phone?',
    a: 'Yes. The coding agent runs in the cloud. Your phone is just the interface. The experience is the same on every device because the compute isn\u2019t on your machine.',
  },
  {
    q: 'Why does Code cost \u20AC10?',
    a: 'When you unlock Code, we spin up a real cloud computer for you. That\u2019s actual infrastructure, not a browser sandbox. \u20AC10 gets you in the door. After that, you bring your own API key or top up credits as you go. No monthly fees. For context, Cursor costs $20/month and Bolt Pro costs $25/month.',
  },
  {
    q: 'What AI models can I use?',
    a: 'Hundreds. Claude, GPT, Gemini, Perplexity, Llama, Mistral, DALL-E, Flux, and more via OpenRouter. Switch mid-conversation or let Anubix route to the best model for each task.',
  },
  {
    q: 'Do I own my code?',
    a: '100%. Push to GitHub, deploy to Vercel, download the files. Nothing is locked in.',
  },
  {
    q: 'What if I already pay for Claude or ChatGPT?',
    a: 'Bring your own API keys. You pay your model provider directly. We provide the cloud infrastructure.',
  },
  {
    q: 'Is this for developers?',
    a: 'Anubix is for anyone who builds with AI. Whether you\u2019re a vibe coder who\u2019s outgrown the simple tools or a developer who wants a cloud-native environment they can access from anywhere. If you can describe what you want to build, you can use Anubix.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--primary-muted),transparent_60%)] opacity-25" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl">
            Questions &amp; answers
          </h2>
        </div>

        {/* Accordion */}
        <div className="mx-auto mt-12 max-w-2xl space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
                aria-expanded={openIndex === i}
              >
                {item.q}
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
