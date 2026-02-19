import { SignIn } from '@clerk/nextjs';

import { generateDefaultMetadata } from '@/lib/metadata-utils';

export async function generateMetadata() {
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/sign-in',
    translations: {
      title: 'Sign In — Anubix',
      description:
        'Sign in to your Anubix account to build and deploy apps by talking.',
      ogSiteName: 'Anubix',
      twitterSite: '@anubix',
    },
    noIndex: true,
  });
}

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4.1rem)] items-center justify-center">
      <SignIn />
    </div>
  );
}
