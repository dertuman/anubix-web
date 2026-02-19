'use client';

import {
  Smartphone,
  Repeat,
  Eye,
  Rocket,
  ShieldCheck,
  Shield,
  Layers,
} from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

const ICON_MAP = [Smartphone, Repeat, Eye, Rocket, ShieldCheck, Shield, Layers] as const;

const FEATURE_KEYS = [
  'mobile',
  'multiModel',
  'livePreview',
  'oneClickDeploy',
  'encrypted',
  'youOwnEverything',
  'patterns',
] as const;

export function FeaturesSection() {
  const t = useScopedI18n('home.features');

  return (
    <section id="features" className="relative">
      <div className="container mx-auto px-4 py-20 md:py-28">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('title')}
          </h2>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key, i) => {
            const Icon = ICON_MAP[i];
            return (
              <div
                key={key}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30 hover:bg-primary-muted"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {t(`${key}.title` as 'multiModel.title')}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`${key}.description` as 'multiModel.description')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
