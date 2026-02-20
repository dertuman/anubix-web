'use client';

/**
 * ============================================================
 * TEMPORARILY PASSWORD-PROTECTED
 * ============================================================
 * The code page is gated behind a simple password while we
 * work on major updates. Public users see a "coming soon" screen.
 *
 * The password is verified server-side via /api/cloud/provision.
 * The ACCESS_PASSWORD env var must be set on the server.
 *
 * The verified password is hashed (SHA-256) and stored in
 * localStorage so returning users skip the gate automatically.
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
 * ============================================================
 */

import { useState, useEffect } from 'react';
import { Lock, EyeIcon, EyeOffIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CodeView } from './components/code-view';

const STORAGE_KEY = 'anubix-access-hash';
const SESSION_KEY = 'anubix-access-password';

/** Hash a string with SHA-256 and return hex digest */
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function CodePage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // On mount, check if we have a stored hash and re-verify it
  useEffect(() => {
    const storedHash = localStorage.getItem(STORAGE_KEY);
    const storedPassword = sessionStorage.getItem(SESSION_KEY);

    if (!storedHash || !storedPassword) {
      setChecking(false);
      return;
    }

    // Re-verify the stored password is still valid
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: storedPassword }),
        });
        if (res.ok) {
          setUnlocked(true);
        } else {
          // Password changed server-side — clear stale data
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        // Network error — still allow if we have a stored hash (offline-friendly)
        setUnlocked(true);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (unlocked) {
    return <CodeView />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Store hash in localStorage (persists across sessions)
        const hash = await hashPassword(password);
        localStorage.setItem(STORAGE_KEY, hash);
        // Store raw password in sessionStorage for re-verification
        sessionStorage.setItem(SESSION_KEY, password);
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-6 px-6 text-center">
        <Image src="/logo.webp" alt="Anubix logo" width={100} height={100} />
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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Enter access code"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
            </button>
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
