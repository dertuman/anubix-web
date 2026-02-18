'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';

import { PROFILES_TABLE_SQL } from '@/lib/setup/sql-template';
import type { SetupData } from './setup-wizard';

interface JwtStepProps {
  data: SetupData;
  updateData: (_updates: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function JwtStep({ data, updateData, onNext, onBack }: JwtStepProps) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(PROFILES_TABLE_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — select text
    }
  };

  const verifyDatabase = async () => {
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/setup/verify-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.supabaseUrl,
          secretKey: data.supabaseSecretKey,
        }),
      });

      const result = await res.json();

      if (result.exists) {
        updateData({ databaseVerified: true });
      } else {
        setError('Profiles table not found. Run the SQL first, then verify again.');
        updateData({ databaseVerified: false });
      }
    } catch {
      setError('Failed to verify. Try again.');
      updateData({ databaseVerified: false });
    } finally {
      setVerifying(false);
    }
  };

  const supabaseProjectRef = data.supabaseUrl
    .replace('https://', '')
    .replace('.supabase.co', '');
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${supabaseProjectRef}/sql/new`;
  const supabaseAuthUrl = `https://supabase.com/dashboard/project/${supabaseProjectRef}/auth/providers`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">Connect Clerk &amp; Supabase</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Two things: enable the Clerk integration and create the database table.
        </p>
      </div>

      {/* Clerk ↔ Supabase integration */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">1. Enable Clerk in Supabase</h3>
        <div className="rounded border border-border bg-muted p-4">
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
            <li>
              Open{' '}
              <a
                href="https://dashboard.clerk.com/setup/supabase"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                Clerk&rsquo;s Supabase setup page
                <ExternalLink className="size-3" />
              </a>{' '}
              and click <span className="text-highlight font-medium">Activate Supabase integration</span>
            </li>
            <li>
              Copy the <span className="text-highlight font-medium">Clerk domain</span> shown after activation
            </li>
            <li>
              In Supabase, go to{' '}
              <a
                href={supabaseAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                Authentication &rarr; Sign In / Providers
                <ExternalLink className="size-3" />
              </a>{' '}
              &rarr; click the <span className="text-highlight font-medium">Third-Party Auth</span> tab
            </li>
            <li>
              Click <span className="text-highlight font-medium">Add provider</span> &rarr; select{' '}
              <span className="text-highlight font-medium">Clerk</span> from the dropdown
            </li>
            <li>
              Paste the Clerk domain &rarr; click{' '}
              <span className="text-highlight font-medium">Create connection</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Database SQL */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">2. Database Table</h3>
        <div className="rounded border border-border bg-muted p-4">
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
            <li>
              Open the{' '}
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                SQL Editor
                <ExternalLink className="size-3" />
              </a>{' '}
              in your Supabase dashboard
            </li>
            <li>
              Copy the SQL below and paste it into the editor, then click{' '}
              <span className="text-highlight font-medium">Run</span>
            </li>
            <li>
              You should see{' '}
              <span className="text-highlight font-medium">&ldquo;Success. No rows returned&rdquo;</span>{' '}
              &mdash; that means the table was created
            </li>
            <li>
              To confirm, go to{' '}
              <span className="text-highlight font-medium">Table Editor</span> in the sidebar &mdash;
              you should see a <span className="text-highlight font-medium">profiles</span> table
              (it will be empty, that&rsquo;s expected)
            </li>
          </ol>
        </div>

        <div className="relative">
          <button
            onClick={copySql}
            className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="size-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3" /> Copy
              </>
            )}
          </button>
          <pre className="max-h-48 overflow-auto rounded border border-border bg-code p-4 text-xs leading-relaxed text-code-foreground">
            <code>{PROFILES_TABLE_SQL}</code>
          </pre>
        </div>
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
            onClick={verifyDatabase}
            disabled={verifying}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              data.databaseVerified
                ? 'border border-success/50 bg-success/10 text-success'
                : 'bg-foreground text-background hover:bg-foreground/90'
            }`}
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" /> Verifying
              </span>
            ) : data.databaseVerified ? (
              <span className="flex items-center gap-2">
                <Check className="size-3.5" /> Table found
              </span>
            ) : (
              'Verify Table'
            )}
          </button>
        </div>

        <button
          onClick={onNext}
          disabled={!data.databaseVerified}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
