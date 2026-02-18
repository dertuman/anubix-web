'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

import type { SetupData } from './setup-wizard';

interface ClerkStepProps {
  data: SetupData;
  updateData: (_updates: Partial<SetupData>) => void;
  onNext: () => void;
}

/**
 * Parse the block Clerk gives you when you hit "Copy" on the API Keys page.
 * Handles formats like:
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123
 *   CLERK_SECRET_KEY=sk_test_xyz789
 */
function parseClerkEnvBlock(text: string): {
  publishableKey: string;
  secretKey: string;
} | null {
  const pk = text.match(
    /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\s*=\s*(pk_(?:test|live)_\S+)/
  );
  const sk = text.match(/CLERK_SECRET_KEY\s*=\s*(sk_(?:test|live)_\S+)/);

  if (pk && sk) {
    return { publishableKey: pk[1], secretKey: sk[1] };
  }
  return null;
}

export function ClerkStep({ data, updateData, onNext }: ClerkStepProps) {
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [parsed, setParsed] = useState(false);

  const canTest =
    data.clerkPublishableKey.startsWith('pk_') &&
    data.clerkSecretKey.startsWith('sk_');

  const handlePaste = (text: string) => {
    setPasteValue(text);

    const result = parseClerkEnvBlock(text);
    if (result) {
      updateData({
        clerkPublishableKey: result.publishableKey,
        clerkSecretKey: result.secretKey,
        clerkVerified: false,
      });
      setParsed(true);
      setError('');
    } else {
      setParsed(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setError('');

    try {
      const res = await fetch('/api/setup/test-clerk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishableKey: data.clerkPublishableKey,
          secretKey: data.clerkSecretKey,
        }),
      });

      const result = await res.json();

      if (result.success) {
        updateData({ clerkVerified: true });
      } else {
        setError(result.error || 'Invalid keys. Double-check them.');
        updateData({ clerkVerified: false });
      }
    } catch {
      setError('Failed to connect. Try again.');
      updateData({ clerkVerified: false });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">Authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clerk handles sign-in, sign-up, and user management.
        </p>
      </div>

      <div className="rounded border border-border bg-muted p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Instructions
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>
            Open{' '}
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
            >
              dashboard.clerk.com
              <ExternalLink className="size-3" />
            </a>
          </li>
          <li>Create an account &amp; application</li>
          <li>
            Go to <span className="text-highlight font-medium">API Keys</span> and hit{' '}
            <span className="text-highlight font-medium">Copy</span>
          </li>
          <li>Paste the whole block below</li>
        </ol>
      </div>

      {/* Single paste area */}
      <div className="space-y-1.5">
        <label htmlFor="clerk-paste" className="text-sm font-medium text-foreground">
          Paste your Clerk keys
        </label>
        <textarea
          id="clerk-paste"
          rows={3}
          placeholder={'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...'}
          value={pasteValue}
          onChange={(e) => handlePaste(e.target.value)}
          className="w-full resize-none rounded border border-border bg-code px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
        {parsed && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Check className="size-3" /> Both keys detected
          </p>
        )}
      </div>

      {/* Parsed keys preview */}
      {parsed && (
        <div className="space-y-2 rounded border border-border bg-muted p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Publishable Key</span>
            <span className="font-mono text-muted-foreground">
              {data.clerkPublishableKey.slice(0, 20)}...
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Secret Key</span>
            <span className="font-mono text-muted-foreground">
              {data.clerkSecretKey.slice(0, 12)}...
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          onClick={testConnection}
          disabled={!canTest || testing}
          className={`rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            data.clerkVerified
              ? 'border border-success/50 bg-success/10 text-success'
              : 'bg-foreground text-background hover:bg-foreground/90'
          }`}
        >
          {testing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" /> Testing
            </span>
          ) : data.clerkVerified ? (
            <span className="flex items-center gap-2">
              <Check className="size-3.5" /> Connected
            </span>
          ) : (
            'Test Connection'
          )}
        </button>

        <button
          onClick={onNext}
          disabled={!data.clerkVerified}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
