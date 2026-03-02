'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';

const PLANS = [
  {
    key: 'chat',
    name: 'Chat',
    tagline: 'Free',
    description: 'Explore every AI model in one place.',
    features: [
      'Access to Claude, GPT, Gemini, Perplexity, and more',
      'Switch models mid-conversation',
      'Image generation with DALL-E and Flux',
      'No credit card required',
    ],
    cta: 'Start with Chat free',
    href: '/workspace?mode=chat',
    featured: false,
  },
  {
    key: 'code',
    name: 'Code',
    tagline: '\u20AC10',
    description: 'Unlock your cloud dev environment.',
    features: [
      'Full cloud VPS with agents, terminal, and file system',
      'Access from any device',
      'One-click deploy to Vercel and GitHub',
      'Bring your own API key (Claude, OpenAI, etc.)',
      'Top up credits as you go via OpenRouter',
      'No monthly subscription. Pay once, start building.',
    ],
    cta: 'Unlock Code - \u20AC10',
    href: '/workspace?mode=code',
    featured: true,
  },
  {
    key: 'byok',
    name: 'Bring your own key',
    tagline: 'Your costs',
    description: 'Already paying for Claude Max, OpenAI, or others?',
    features: [
      'Connect your existing API keys',
      'Use your subscriptions through Anubix',
      'We provide the cloud infrastructure',
      'You control your costs completely',
    ],
    cta: 'Get started',
    href: '/workspace',
    featured: false,
  },
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="relative border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--primary-muted),transparent_50%)] opacity-30" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Pay for what you use. No subscriptions. No surprises.
          </h2>
        </div>

        {/* Plans */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all sm:p-8 ${
                plan.featured
                  ? 'border-primary/40 bg-primary/5 shadow-xl shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/20 hover:bg-primary-muted'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-baseline gap-2">
                  <p className={`text-lg font-medium ${plan.featured ? 'text-primary' : 'text-foreground'}`}>
                    {plan.name}
                  </p>
                  <span className="text-sm text-muted-foreground">{plan.tagline}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link href={plan.href}>
                  <Button
                    variant={plan.featured ? 'default' : 'outline'}
                    size="lg"
                    className="w-full gap-2"
                  >
                    {plan.cta}
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
