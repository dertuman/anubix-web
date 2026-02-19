import { generateDefaultMetadata } from '@/lib/metadata-utils';
import ChatLayoutShell from './chat-layout-shell';

export async function generateMetadata() {
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/chat',
    translations: {
      title: 'Chat — Anubix',
      description:
        'Talk to Anubix to build, iterate, and deploy your web apps in real time. No coding needed.',
      ogSiteName: 'Anubix',
      imageAlt: 'Anubix Chat — Build apps by talking',
      twitterSite: '@anubix',
    },
    keywords: [
      'Anubix chat',
      'AI chat',
      'build apps',
      'conversational development',
      'no-code chat',
    ],
  });
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatLayoutShell>{children}</ChatLayoutShell>;
}
