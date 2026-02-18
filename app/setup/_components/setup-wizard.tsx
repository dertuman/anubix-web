'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

import { ClerkStep } from './clerk-step';
import { SupabaseStep } from './supabase-step';
import { JwtStep } from './jwt-step';
import { DeployStep } from './deploy-step';

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

const STEPS = [
  { title: 'Auth', description: 'Clerk' },
  { title: 'Database', description: 'Supabase' },
  { title: 'Connect', description: 'Clerk + Table' },
  { title: 'Deploy', description: 'GitHub + Vercel' },
];

export function SetupWizard() {
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
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Configure your site
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect authentication and database. About 5 minutes.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex items-center">
            <button
              onClick={() => {
                if (i < currentStep) setCurrentStep(i);
              }}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                i === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i < currentStep
                    ? 'cursor-pointer bg-muted text-success hover:bg-accent'
                    : 'cursor-default bg-muted text-muted-foreground'
              }`}
            >
              {i < currentStep ? (
                <Check className="size-3" />
              ) : (
                <span className={`text-[10px] ${i === currentStep ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{i + 1}</span>
              )}
              {step.title}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-px w-6 ${
                  i < currentStep ? 'bg-border' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-border bg-background p-6">
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
