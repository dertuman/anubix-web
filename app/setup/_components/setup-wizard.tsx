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
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          Setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Configure your site
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
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
                  ? 'bg-white text-black'
                  : i < currentStep
                    ? 'cursor-pointer bg-neutral-800 text-emerald-400 hover:bg-neutral-700'
                    : 'cursor-default bg-neutral-900 text-neutral-600'
              }`}
            >
              {i < currentStep ? (
                <Check className="size-3" />
              ) : (
                <span className="text-[10px] text-neutral-500">{i + 1}</span>
              )}
              {step.title}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-px w-6 ${
                  i < currentStep ? 'bg-neutral-600' : 'bg-neutral-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
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
