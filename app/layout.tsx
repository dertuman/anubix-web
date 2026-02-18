import '@/styles/globals.css';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { fontSans } from '@/lib/fonts';
import { getLocale } from '@/lib/i18n';
import { generateDefaultMetadata } from '@/lib/metadata-utils';
import { isAppConfigured } from '@/lib/setup/config';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const AnimatedBackground = dynamic(
  () =>
    import('@/components/animated-background').then(
      (mod) => mod.AnimatedBackground
    ),
  {
    loading: () => null,
  }
);

export async function generateMetadata() {
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/',
    translations: {
      title: 'PROJECT',
      description: 'Discover PROJECT, the ultimate platform.',
      ogLocale: 'en',
      ogSiteName: 'PROJECT',
      imageAlt: 'PROJECT',
      twitterSite: '@PROJECT',
    },
  });
}

/**
 * Configured shell — loaded dynamically to avoid importing @clerk/nextjs
 * at module level (which crashes when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing).
 */
async function ConfiguredBody({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const { ClerkProvider } = await import('@clerk/nextjs');
  const { UserDataProvider } = await import('@/context/UserDataContext');
  const { I18nProviderClient } = await import('@/locales/client');
  const { default: ReactQueryProvider } = await import(
    '@/components/react-query-provider'
  );
  const { SiteHeader } = await import('@/components/site-header');
  const { ConditionalFooter } = await import('@/components/conditional-footer');
  const { TailwindIndicator } = await import('@/components/tailwind-indicator');

  return (
    <ClerkProvider>
      <ReactQueryProvider>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <I18nProviderClient locale={locale}>
            <UserDataProvider>
              <div className="relative flex min-h-dvh flex-col">
                <Suspense fallback={null}>
                  <AnimatedBackground />
                </Suspense>
                <SiteHeader />
                <div className="flex flex-1 flex-col items-center">
                  {children}
                </div>
                <ConditionalFooter />
              </div>
              <TailwindIndicator />
              <Toaster />
            </UserDataProvider>
          </I18nProviderClient>
        </ThemeProvider>
      </ReactQueryProvider>
    </ClerkProvider>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const configured = isAppConfigured();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" />
        {configured && (
          <>
            <link rel="shortcut icon" href="/favicon-16x16.png" />
            <link rel="apple-touch-icon" href="/favicon-16x16.png" />
            <link rel="manifest" href="/manifest.json" />
          </>
        )}
        <meta name="theme-color" content="#09090b" />
        {configured && (
          <>
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta
              name="apple-mobile-web-app-status-bar-style"
              content="default"
            />
            <meta name="apple-mobile-web-app-title" content="Project" />
            <meta name="mobile-web-app-capable" content="yes" />
          </>
        )}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body
        className={cn(
          'custom-scrollbar min-h-dvh font-sans antialiased',
          fontSans.variable
        )}
      >
        {configured ? (
          <ConfiguredBody locale={locale}>{children}</ConfiguredBody>
        ) : (
          <ThemeProvider attribute="class" defaultTheme="dark">
            <div className="relative flex min-h-dvh flex-col">
              <div className="flex flex-1 flex-col items-center">
                {children}
              </div>
            </div>
            <Toaster />
          </ThemeProvider>
        )}
      </body>
    </html>
  );
}
