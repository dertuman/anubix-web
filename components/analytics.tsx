'use client';

import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';

import {
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  NEXT_PUBLIC_GTM_ID,
} from '@/lib/constants';

export function Analytics() {
  return (
    <>
      <GoogleTagManager gtmId={NEXT_PUBLIC_GTM_ID} />
      <GoogleAnalytics gaId={NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
    </>
  );
}
