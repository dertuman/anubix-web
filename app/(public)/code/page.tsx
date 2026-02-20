'use client';

/**
 * ============================================================
 * TEMPORARILY DISABLED — Coming Soon
 * ============================================================
 * The code page has been disabled while we work on major updates.
 *
 * TO RE-ENABLE:
 * 1. Remove this entire file content
 * 2. Restore the original CodeView import and render:
 *
 *    'use client';
 *    import { CodeView } from './components/code-view';
 *    export default function CodePage() {
 *      return <CodeView />;
 *    }
 *
 * 3. Also re-enable the provisioning API at:
 *    app/api/cloud/provision/route.ts
 *    (remove the early 503 return at the top of POST)
 * ============================================================
 */

import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function CodePage() {
  return (
    <div className="flex h-[calc(100dvh-4.1rem)] w-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-6 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Something amazing is coming
          </h1>
          <p className="text-muted-foreground">
            We&apos;re working on a major upgrade to the coding experience.
            Stay tuned — it&apos;ll be worth the wait.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
