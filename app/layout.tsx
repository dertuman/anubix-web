import '@/styles/globals.css';

import { fontSans } from '@/lib/fonts';
import { getLocale } from '@/lib/i18n';
import { generateDefaultMetadata } from '@/lib/metadata-utils';
import { isAppConfigured } from '@/lib/setup/config';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { JsonLd } from '@/components/json-ld';

export async function generateMetadata() {
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/',
    translations: {
      title: 'Anubix — Build apps by talking',
      description:
        'Describe what you want. Anubix builds it, deploys it, and hands you the keys. No code required.',
      ogLocale: 'en',
      ogSiteName: 'Anubix',
      imageAlt: 'Anubix — Build apps by talking. No code required.',
      twitterSite: '@anubix',
    },
    keywords: [
      'Anubix',
      'no-code',
      'app builder',
      'AI app builder',
      'build apps by talking',
      'deploy apps',
      'web app generator',
      'conversational development',
      'no code platform',
    ],
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
                <SiteHeader />
                <div className="flex flex-1 flex-col">{children}</div>
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

/**
 * Unconfigured shell — wraps children with I18nProviderClient and ThemeProvider
 * so the setup wizard can use i18n hooks.
 */
async function UnconfiguredBody({ children }: { children: React.ReactNode }) {
  const { I18nProviderClient } = await import('@/locales/client');

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <I18nProviderClient locale="en">
        <div className="relative flex min-h-dvh flex-col">
          <div className="flex flex-1 flex-col items-center">{children}</div>
        </div>
        <Toaster />
      </I18nProviderClient>
    </ThemeProvider>
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
        {/* Favicons — multiple sizes for browser tabs, bookmarks, and OS icons */}
        <link rel="icon" href="/favicon.png" sizes="64x64" type="image/png" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        {configured && (
          <>
            <link rel="shortcut icon" href="/favicon.png" />
            <link rel="apple-touch-icon" href="/logo.webp" />
            <link rel="manifest" href="/manifest.json" />
          </>
        )}

        {/* Theme colour — used by browsers, Discord embed accent, and mobile UI */}
        <meta name="theme-color" content="#34d399" />
        <meta name="msapplication-TileColor" content="#09090b" />

        {configured && (
          <>
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta
              name="apple-mobile-web-app-status-bar-style"
              content="black-translucent"
            />
            <meta name="apple-mobile-web-app-title" content="Anubix" />
            <meta name="mobile-web-app-capable" content="yes" />
          </>
        )}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <JsonLd />
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
          <UnconfiguredBody>{children}</UnconfiguredBody>
        )}
      </body>
    </html>
  );
}
