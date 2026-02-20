'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';

import { PROFILES_TABLE_SQL } from '@/lib/setup/sql-template';
import { useScopedI18n } from '@/locales/client';
import { Button } from '@/components/ui/button';
import type { SetupData } from './setup-wizard';

interface JwtStepProps {
  data: SetupData;
  updateData: (_updates: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function JwtStep({ data, updateData, onNext, onBack }: JwtStepProps) {
  const t = useScopedI18n('setup.jwt');
  const tCommon = useScopedI18n('common');
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
        setError(t('tableNotFound'));
        updateData({ databaseVerified: false });
      }
    } catch {
      setError(t('failedToVerify'));
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
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Clerk ↔ Supabase integration */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          {t('enableClerk')}
        </h3>
        <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Open{' '}
              <a
                href="https://dashboard.clerk.com/setup/supabase"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                {t('clerkSetupPage')}
                <ExternalLink className="size-3" />
              </a>{' '}
              and click{' '}
              <span className="font-medium text-highlight">
                {t('activateIntegration')}
              </span>
            </li>
            <li>
              Copy the{' '}
              <span className="font-medium text-highlight">
                {t('copyClerkDomain')}
              </span>{' '}
              shown after activation
            </li>
            <li>
              In Supabase, go to{' '}
              <a
                href={supabaseAuthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                {t('authProviders')}
                <ExternalLink className="size-3" />
              </a>{' '}
              &rarr; click the{' '}
              <span className="font-medium text-highlight">
                {t('thirdPartyAuth')}
              </span>{' '}
              tab
            </li>
            <li>
              Click{' '}
              <span className="font-medium text-highlight">
                {t('addProvider')}
              </span>{' '}
              &rarr; select{' '}
              <span className="font-medium text-highlight">
                {t('selectClerk')}
              </span>{' '}
              from the dropdown
            </li>
            <li>
              Paste the Clerk domain &rarr; click{' '}
              <span className="font-medium text-highlight">
                {t('pasteAndCreate')}
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* Database SQL */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          {t('databaseTable')}
        </h3>
        <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              Open the{' '}
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                {t('sqlEditor')}
                <ExternalLink className="size-3" />
              </a>{' '}
              {t('inYourDashboard')}
            </li>
            <li>
              {t('copyAndPasteSql')}{' '}
              <span className="font-medium text-highlight">{t('runSql')}</span>
            </li>
            <li>
              You should see{' '}
              <span className="font-medium text-highlight">
                {t('successMessage')}
              </span>{' '}
              &mdash; {t('tableCreated')}
            </li>
            <li>
              To confirm, go to{' '}
              <span className="font-medium text-highlight">
                {t('tableEditor')}
              </span>{' '}
              in the sidebar &mdash; you should see a{' '}
              <span className="font-medium text-highlight">
                {t('profilesTable')}
              </span>{' '}
              table {t('emptyExpected')}
            </li>
          </ol>
        </div>

        <div className="relative">
          <button
            onClick={copySql}
            className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:right-2 sm:top-2 sm:px-2.5"
          >
            {copied ? (
              <>
                <Check className="size-3" /> {tCommon('copied')}
              </>
            ) : (
              <>
                <Copy className="size-3" /> {tCommon('copy')}
              </>
            )}
          </button>
          <pre className="max-h-36 overflow-auto rounded-lg border border-border bg-code p-3 text-xs leading-relaxed text-code-foreground sm:max-h-48 sm:p-4">
            <code>{PROFILES_TABLE_SQL}</code>
          </pre>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 border-t border-border pt-4 xs:flex-row xs:items-center xs:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-3.5" /> {tCommon('back')}
          </Button>
          <Button
            onClick={verifyDatabase}
            disabled={verifying}
            variant={data.databaseVerified ? 'outline' : 'default'}
            className={
              data.databaseVerified
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                : ''
            }
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />{' '}
                {t('verifying')}
              </span>
            ) : data.databaseVerified ? (
              <span className="flex items-center gap-2">
                <Check className="size-3.5" /> {t('tableFound')}
              </span>
            ) : (
              t('verifyTable')
            )}
          </Button>
        </div>

        <Button
          onClick={onNext}
          disabled={!data.databaseVerified}
          variant="outline"
          className="bg-foreground text-background hover:bg-foreground/80 hover:text-background"
        >
          {tCommon('continue')}
        </Button>
      </div>
    </div>
  );
}
