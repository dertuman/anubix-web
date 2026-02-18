'use client';

import { useState } from 'react';
import { Check, Eye } from 'lucide-react';

import { ClerkStep } from './clerk-step';
import { SupabaseStep } from './supabase-step';
import { JwtStep } from './jwt-step';
import { DeployStep } from './deploy-step';
import { useScopedI18n } from '@/locales/client';

export interface SetupData {
  clerkPublishableKey: string;
  clerkSecretKey: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  clerkVerified: boolean;
  supabaseVerified: boolean;
  databaseVerified: boolean;
}

export function SetupWizard() {
  const t = useScopedI18n('setup');

  const STEPS = [
    { title: t('steps.auth'), description: t('steps.clerkDescription') },
    {
      title: t('steps.database'),
      description: t('steps.supabaseDescription'),
    },
    {
      title: t('steps.connect'),
      description: t('steps.connectDescription'),
    },
    { title: t('steps.deploy'), description: t('steps.deployDescription') },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<SetupData>({
    clerkPublishableKey: '',
    clerkSecretKey: '',
    supabaseUrl: '',
    supabasePublishableKey: '',
    supabaseSecretKey: '',
    clerkVerified: false,
    supabaseVerified: false,
    databaseVerified: false,
  });

  const updateData = (updates: Partial<SetupData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t('title')}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {t('configureYourSite')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('connectAndConfigure')}
        </p>

        {/* Skip for now */}
        <button className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <Eye className="size-3.5" />
          {t('skipForNow')}
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex items-center">
            <button
              onClick={() => {
                if (i < currentStep) setCurrentStep(i);
              }}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                i === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i < currentStep
                    ? 'cursor-pointer bg-muted text-primary hover:bg-accent'
                    : 'cursor-default bg-muted text-muted-foreground'
              }`}
            >
              {i < currentStep ? (
                <Check className="size-3" />
              ) : (
                <span
                  className={`text-[10px] ${i === currentStep ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                >
                  {i + 1}
                </span>
              )}
              {step.title}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-px w-6 ${
                  i < currentStep ? 'bg-primary/30' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {currentStep === 0 && (
          <ClerkStep data={data} updateData={updateData} onNext={nextStep} />
        )}
        {currentStep === 1 && (
          <SupabaseStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 2 && (
          <JwtStep
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 3 && <DeployStep data={data} onBack={prevStep} />}
      </div>
    </div>
  );
}
