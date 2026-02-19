import { SignUp } from '@clerk/nextjs';

import { generateDefaultMetadata } from '@/lib/metadata-utils';

export async function generateMetadata() {
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/sign-up',
    translations: {
      title: 'Sign Up — Anubix',
      description:
        'Create your free Anubix account and start building apps by talking. No code required.',
      ogSiteName: 'Anubix',
      twitterSite: '@anubix',
    },
    noIndex: true,
  });
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4.1rem)] items-center justify-center">
      <SignUp />
    </div>
  );
}
