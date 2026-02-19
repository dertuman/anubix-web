import { generateDefaultMetadata } from '@/lib/metadata-utils';
import CodeLayoutShell from './code-layout-shell';

export async function generateMetadata() {
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/code',
    translations: {
      title: 'Code — Anubix',
      description:
        'View and edit the generated code for your Anubix apps. Full source access with live preview.',
      ogSiteName: 'Anubix',
      imageAlt: 'Anubix Code Editor — View and edit your app code',
      twitterSite: '@anubix',
    },
    keywords: [
      'Anubix code editor',
      'AI generated code',
      'code view',
      'web app code',
      'live preview',
    ],
  });
}

export default function CodeLayout({ children }: { children: React.ReactNode }) {
  return <CodeLayoutShell>{children}</CodeLayoutShell>;
}
