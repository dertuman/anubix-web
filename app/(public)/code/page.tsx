'use client';

/**
 * ============================================================
 * TEMPORARILY PASSWORD-PROTECTED
 * ============================================================
 * The code page is gated behind a simple password while we
 * work on major updates. Public users see a "coming soon" screen.
 *
 * TO RE-ENABLE (remove password gate):
 * 1. Replace this entire file with:
 *
 *    'use client';
 *    import { CodeView } from './components/code-view';
 *    export default function CodePage() {
 *      return <CodeView />;
 *    }
 *
 * 2. Also re-enable the provisioning API at:
 *    app/api/cloud/provision/route.ts
 *    (revert from git history)
 *
 * PASSWORD: anubix2026
 * ============================================================
 */

import { useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';
import { CodeView } from './components/code-view';

const ACCESS_PASSWORD = 'anubix2026';

export default function CodePage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  if (unlocked) {
    return <CodeView />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      sessionStorage.setItem('anubix-access-password', password);
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

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

        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Enter access code"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">Wrong password</p>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Access
          </button>
        </form>

        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
