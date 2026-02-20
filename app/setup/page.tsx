import { redirect } from 'next/navigation';

import { isAppConfigured } from '@/lib/setup/config';
import { SetupWizard } from './_components/setup-wizard';

export const metadata = {
  title: 'Setup — Configure Your Site',
  description: 'Set up your authentication and database to get started.',
};

export default function SetupPage() {
  // If already configured, redirect to home
  if (isAppConfigured()) {
    redirect('/');
  }

  return (
    <div className="container flex min-h-dvh max-w-2xl flex-col items-center justify-center px-3 py-6 sm:px-4 sm:py-12 md:py-16">
      <SetupWizard />
    </div>
  );
}
