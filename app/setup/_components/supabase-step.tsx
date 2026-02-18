'use client';

import { useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Loader2 } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import { Button } from '@/components/ui/button';

import type { SetupData } from './setup-wizard';

interface SupabaseStepProps {
  data: SetupData;
  updateData: (_updates: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Parse a pasted block containing Supabase credentials.
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
  const secret = text.match(/SUPABASE_SECRET_DEFAULT_KEY\s*=\s*(\S+)/);

  if (url || publishable || secret) {
    return {
      url: url?.[1],
      publishableKey: publishable?.[1],
      secretKey: secret?.[1],
    };
  }
  return null;
}

export function SupabaseStep({
  data,
  updateData,
  onNext,
  onBack,
}: SupabaseStepProps) {
  const t = useScopedI18n('setup.supabase');
  const tCommon = useScopedI18n('common');
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
      if (result.url) {
        updates.supabaseUrl = result.url;
        count++;
      }
      if (result.publishableKey) {
        updates.supabasePublishableKey = result.publishableKey;
        count++;
      }
      if (result.secretKey) {
        updates.supabaseSecretKey = result.secretKey;
        count++;
      }
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
        setError(result.error || t('couldNotConnect'));
        updateData({ supabaseVerified: false });
      }
    } catch {
      setError(t('failedToConnect'));
      updateData({ supabaseVerified: false });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('howToGetKeys')}
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Open{' '}
            <a
              href="https://supabase.com/dashboard"
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
            Click{' '}
            <span className="font-medium text-highlight">
              {t('clickConnect')}
            </span>{' '}
            (top of page) &rarr; copy the{' '}
            <span className="font-medium text-highlight">
              {t('envLocalBlock')}
            </span>{' '}
            block
          </li>
          <li>{t('pasteBelow')}</li>
        </ol>
      </div>

      {/* Primary paste area */}
      <div className="space-y-1.5">
        <label
          htmlFor="sb-paste"
          className="text-sm font-medium text-foreground"
        >
          {t('pasteYourEnv')}
        </label>
        <textarea
          id="sb-paste"
          rows={3}
          placeholder={
            'NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...'
          }
          value={pasteValue}
          onChange={(e) => handlePaste(e.target.value)}
          className="w-full resize-none rounded-lg border border-border bg-code px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
        {parsedCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-primary">
            <Check className="size-3" />{' '}
            {parsedCount > 1
              ? t('valuesDetectedPlural', { count: parsedCount })
              : t('valuesDetected', { count: parsedCount })}
          </p>
        )}
      </div>

      {/* Parsed values preview */}
      {parsedCount > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          {data.supabaseUrl && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('projectUrl')}</span>
              <span className="font-mono text-muted-foreground">
                {data.supabaseUrl}
              </span>
            </div>
          )}
          {data.supabasePublishableKey && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t('publishableKey')}
              </span>
              <span className="font-mono text-muted-foreground">
                {data.supabasePublishableKey.slice(0, 24)}...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Secret key */}
      <div className="space-y-1.5">
        <label
          htmlFor="sb-secret"
          className="text-sm font-medium text-foreground"
        >
          {t('secretKey')}
        </label>
        <p className="text-xs text-muted-foreground">
          {t('secretKeyDescription')}
        </p>
        <input
          id="sb-secret"
          type="password"
          placeholder="sb_secret_..."
          value={data.supabaseSecretKey}
          onChange={(e) => {
            updateData({
              supabaseSecretKey: e.target.value.trim(),
              supabaseVerified: false,
            });
            setError('');
          }}
          className="w-full rounded-lg border border-border bg-code px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-3.5" /> {tCommon('back')}
          </Button>
          <Button
            onClick={testConnection}
            disabled={!canTest || testing}
            variant={data.supabaseVerified ? 'outline' : 'default'}
            className={
              data.supabaseVerified
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                : ''
            }
          >
            {testing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />{' '}
                {tCommon('testing')}
              </span>
            ) : data.supabaseVerified ? (
              <span className="flex items-center gap-2">
                <Check className="size-3.5" /> {tCommon('connected')}
              </span>
            ) : (
              tCommon('testConnection')
            )}
          </Button>
        </div>

        <Button
          onClick={onNext}
          disabled={!data.supabaseVerified}
          variant="outline"
          className="bg-foreground text-background hover:bg-foreground/80 hover:text-background"
        >
          {tCommon('continue')}
        </Button>
      </div>
    </div>
  );
}
