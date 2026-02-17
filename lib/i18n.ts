import { cookies } from 'next/headers';

import { defaultLocale, type Locale } from '@/lib/locales';

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('Next-Locale')?.value as Locale | undefined;
  return locale && ['en', 'es'].includes(locale) ? locale : defaultLocale;
}
