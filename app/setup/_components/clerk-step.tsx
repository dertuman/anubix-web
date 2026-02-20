'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { Button } from '@/components/ui/button';

import type { SetupData } from './setup-wizard';

interface ClerkStepProps {
  data: SetupData;
  updateData: (_updates: Partial<SetupData>) => void;
  onNext: () => void;
}

/**
 * Parse the block Clerk gives you when you hit "Copy" on the API Keys page.
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
  const t = useScopedI18n('setup.clerk');
  const tCommon = useScopedI18n('common');
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
        setError(result.error || t('invalidKeys'));
        updateData({ clerkVerified: false });
      }
    } catch {
      setError(t('failedToConnect'));
      updateData({ clerkVerified: false });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('instructions')}
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Open{' '}
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
            >
              {t('openDashboard')}
              <ExternalLink className="size-3" />
            </a>
          </li>
          <li>{t('createAccount')}</li>
          <li>
            Go to{' '}
            <span className="font-medium text-highlight">{t('goToApiKeys')}</span>{' '}
            and hit{' '}
            <span className="font-medium text-highlight">{t('hitCopy')}</span>
          </li>
          <li>{t('pasteBelow')}</li>
        </ol>
      </div>

      {/* Paste area */}
      <div className="space-y-1.5">
        <label
          htmlFor="clerk-paste"
          className="text-sm font-medium text-foreground"
        >
          {t('pasteYourKeys')}
        </label>
        <textarea
          id="clerk-paste"
          rows={3}
          placeholder={
            'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...'
          }
          value={pasteValue}
          onChange={(e) => handlePaste(e.target.value)}
          className="w-full resize-none rounded-lg border border-border bg-code px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
        {parsed && (
          <p className="flex items-center gap-1.5 text-xs text-primary">
            <Check className="size-3" /> {t('bothKeysDetected')}
          </p>
        )}
      </div>

      {/* Parsed keys preview */}
      {parsed && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex flex-col gap-0.5 text-xs xs:flex-row xs:items-center xs:justify-between">
            <span className="text-muted-foreground">{t('publishableKey')}</span>
            <span className="truncate font-mono text-muted-foreground">
              {data.clerkPublishableKey.slice(0, 20)}...
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs xs:flex-row xs:items-center xs:justify-between">
            <span className="text-muted-foreground">{t('secretKey')}</span>
            <span className="truncate font-mono text-muted-foreground">
              {data.clerkSecretKey.slice(0, 12)}...
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 border-t border-border pt-4 xs:flex-row xs:items-center xs:justify-between">
        <Button
          onClick={testConnection}
          disabled={!canTest || testing}
          variant={data.clerkVerified ? 'outline' : 'default'}
          className={
            data.clerkVerified
              ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
              : ''
          }
        >
          {testing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />{' '}
              {tCommon('testing')}
            </span>
          ) : data.clerkVerified ? (
            <span className="flex items-center gap-2">
              <Check className="size-3.5" /> {tCommon('connected')}
            </span>
          ) : (
            tCommon('testConnection')
          )}
        </Button>

        <Button
          onClick={onNext}
          disabled={!data.clerkVerified}
          variant="outline"
          className="bg-foreground text-background hover:bg-foreground/80 hover:text-background"
        >
          {tCommon('continue')}
        </Button>
      </div>
    </div>
  );
}
