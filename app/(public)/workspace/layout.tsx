import { generateDefaultMetadata } from '@/lib/metadata-utils';
import WorkspaceLayoutShell from './workspace-layout-shell';

export async function generateMetadata() {
  return generateDefaultMetadata({
    currentLocale: 'en',
    path: '/workspace',
    translations: {
      title: 'Workspace — Anubix',
      description:
        'Unified workspace for chat and code. Switch seamlessly between conversational AI and agent-based coding.',
      ogSiteName: 'Anubix',
      imageAlt: 'Anubix Workspace — Chat and Code in one place',
      twitterSite: '@anubix',
    },
    keywords: [
      'Anubix workspace',
      'AI chat',
      'code editor',
      'unified interface',
      'agent coding',
    ],
  });
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceLayoutShell>{children}</WorkspaceLayoutShell>;
}
