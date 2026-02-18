'use client';

import { useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Loader2 } from 'lucide-react';

import type { SetupData } from './setup-wizard';

interface SupabaseStepProps {
  data: SetupData;
  updateData: (_updates: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Parse a pasted block containing Supabase credentials.
 * Handles the .env.local format from Supabase's "Connect to your project" modal:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
 *
 * Also handles the secret key if included:
 *   SUPABASE_SECRET_DEFAULT_KEY=sb_secret_...
 */
function parseSupabaseBlock(text: string): {
  url?: string;
  publishableKey?: string;
  secretKey?: string;
} | null {
  const url = text.match(
    /NEXT_PUBLIC_SUPABASE_URL\s*=\s*(https:\/\/\S+\.supabase\.co)/
  );
  const publishable = text.match(
    /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY\s*=\s*(\S+)/
  );
  const secret = text.match(
    /SUPABASE_SECRET_DEFAULT_KEY\s*=\s*(\S+)/
  );

  if (url || publishable || secret) {
    return {
      url: url?.[1],
      publishableKey: publishable?.[1],
      secretKey: secret?.[1],
    };
  }
  return null;
}

export function SupabaseStep({ data, updateData, onNext, onBack }: SupabaseStepProps) {
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [parsedCount, setParsedCount] = useState(0);

  const canTest =
    data.supabaseUrl.includes('supabase') &&
    data.supabasePublishableKey.length > 10 &&
    data.supabaseSecretKey.length > 10;

  const handlePaste = (text: string) => {
    setPasteValue(text);
    setError('');

    const result = parseSupabaseBlock(text);
    if (result) {
      const updates: Partial<typeof data> = { supabaseVerified: false };
      let count = 0;
      if (result.url) { updates.supabaseUrl = result.url; count++; }
      if (result.publishableKey) { updates.supabasePublishableKey = result.publishableKey; count++; }
      if (result.secretKey) { updates.supabaseSecretKey = result.secretKey; count++; }
      updateData(updates);
      setParsedCount(count);
    } else {
      setParsedCount(0);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setError('');

    try {
      const res = await fetch('/api/setup/test-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.supabaseUrl,
          publishableKey: data.supabasePublishableKey,
          secretKey: data.supabaseSecretKey,
        }),
      });

      const result = await res.json();

      if (result.success) {
        updateData({ supabaseVerified: true });
      } else {
        setError(result.error || 'Could not connect. Double-check your keys.');
        updateData({ supabaseVerified: false });
      }
    } catch {
      setError('Failed to connect. Try again.');
      updateData({ supabaseVerified: false });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">Database</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Supabase provides your Postgres database with row-level security.
        </p>
      </div>

      <div className="rounded border border-border bg-muted p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          How to get your keys
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>
            Open{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
            >
              supabase.com/dashboard
              <ExternalLink className="size-3" />
            </a>
          </li>
          <li>Create an account &amp; new project</li>
          <li>
            Click <span className="text-highlight font-medium">Connect</span> (top of page) &rarr; copy the{' '}
            <span className="text-highlight font-medium">.env.local</span> block
          </li>
          <li>Paste it below</li>
        </ol>
      </div>

      {/* Primary paste area */}
      <div className="space-y-1.5">
        <label htmlFor="sb-paste" className="text-sm font-medium text-foreground">
          Paste your Supabase .env.local
        </label>
        <textarea
          id="sb-paste"
          rows={3}
          placeholder={'NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...'}
          value={pasteValue}
          onChange={(e) => handlePaste(e.target.value)}
          className="w-full resize-none rounded border border-border bg-code px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
        {parsedCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Check className="size-3" /> {parsedCount} value{parsedCount > 1 ? 's' : ''} detected
          </p>
        )}
      </div>

      {/* Parsed values preview */}
      {parsedCount > 0 && (
        <div className="space-y-2 rounded border border-border bg-muted p-3">
          {data.supabaseUrl && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Project URL</span>
              <span className="font-mono text-muted-foreground">
                {data.supabaseUrl}
              </span>
            </div>
          )}
          {data.supabasePublishableKey && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Publishable Key</span>
              <span className="font-mono text-muted-foreground">
                {data.supabasePublishableKey.slice(0, 24)}...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Secret key — separate input */}
      <div className="space-y-1.5">
        <label htmlFor="sb-secret" className="text-sm font-medium text-foreground">
          Secret Key
        </label>
        <p className="text-xs text-muted-foreground">
          In your Supabase dashboard, go to{' '}
          <span className="text-highlight">Settings</span> &rarr;{' '}
          <span className="text-highlight">API Keys</span> &rarr;{' '}
          under <span className="text-highlight">&ldquo;Secret keys&rdquo;</span>, click the copy icon next to the{' '}
          <span className="text-highlight">default</span> key. Stored server-side only, never exposed to the browser.
        </p>
        <input
          id="sb-secret"
          type="password"
          placeholder="sb_secret_..."
          value={data.supabaseSecretKey}
          onChange={(e) => {
            updateData({ supabaseSecretKey: e.target.value.trim(), supabaseVerified: false });
            setError('');
          }}
          className="w-full rounded border border-border bg-code px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back
          </button>
          <button
            onClick={testConnection}
            disabled={!canTest || testing}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              data.supabaseVerified
                ? 'border border-success/50 bg-success/10 text-success'
                : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
          >
            {testing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" /> Testing
              </span>
            ) : data.supabaseVerified ? (
              <span className="flex items-center gap-2">
                <Check className="size-3.5" /> Connected
              </span>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>

        <button
          onClick={onNext}
          disabled={!data.supabaseVerified}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
