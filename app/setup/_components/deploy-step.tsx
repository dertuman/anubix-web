'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { Button } from '@/components/ui/button';
import type { SetupData } from './setup-wizard';

interface DeployStepProps {
  data: SetupData;
  onBack: () => void;
}

type StepStatus = 'idle' | 'running' | 'done' | 'error';
type RepoCheck = 'idle' | 'checking' | 'available' | 'taken' | 'error';
type RepoMode = 'new' | 'existing';

export function DeployStep({ data, onBack }: DeployStepProps) {
  const t = useScopedI18n('setup.deploy');
  const tCommon = useScopedI18n('common');

  const [repoMode, setRepoMode] = useState<RepoMode>('new');

  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState('my-site');
  const [vercelToken, setVercelToken] = useState('');

  // Existing repo mode
  const [existingRepo, setExistingRepo] = useState(''); // "owner/repo" format

  const [githubStatus, setGithubStatus] = useState<StepStatus>('idle');
  const [vercelStatus, setVercelStatus] = useState<StepStatus>('idle');

  const [repoUrl, setRepoUrl] = useState('');
  const [deployUrl, setDeployUrl] = useState('');
  const [error, setError] = useState('');

  // Internal state for passing data between steps
  const [githubOwner, setGithubOwner] = useState('');

  // Repo name availability check (new repo mode only)
  const [repoCheck, setRepoCheck] = useState<RepoCheck>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GitHub push progress
  const [ghProgress, setGhProgress] = useState(0); // 0-100
  const [ghProgressLabel, setGhProgressLabel] = useState('');
  const [ghFileInfo, setGhFileInfo] = useState(''); // e.g. "42 / 141"

  // Fetch GitHub username when token is pasted
  useEffect(() => {
    if (githubToken.length < 10) {
      setGithubOwner('');
      setRepoCheck('idle');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
          },
        });
        if (!res.ok) return;
        const user = await res.json();
        if (!cancelled) {
          setGithubOwner(user.login);
        }
      } catch {
        // Silently fail
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [githubToken]);

  // Debounced repo name availability check (new repo mode only)
  const checkRepoName = useCallback(
    (name: string, owner: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!owner || name.length < 2 || githubToken.length < 10) {
        setRepoCheck('idle');
        return;
      }

      setRepoCheck('checking');

      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${name}`,
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github+json',
              },
            }
          );

          if (res.status === 404) {
            setRepoCheck('available');
          } else if (res.ok) {
            setRepoCheck('taken');
          } else {
            setRepoCheck('error');
          }
        } catch {
          setRepoCheck('error');
        }
      }, 500);
    },
    [githubToken]
  );

  useEffect(() => {
    if (repoMode === 'new') {
      checkRepoName(repoName, githubOwner);
    }
  }, [repoName, githubOwner, checkRepoName, repoMode]);

  const canDeployNew =
    githubToken.length > 10 &&
    repoName.length > 1 &&
    vercelToken.length > 10 &&
    (repoCheck !== 'taken' || githubStatus === 'done');

  const canDeployExisting =
    existingRepo.includes('/') &&
    existingRepo.split('/').every((part) => part.length > 0) &&
    vercelToken.length > 10;

  const canDeploy = repoMode === 'new' ? canDeployNew : canDeployExisting;

  const isRunning = githubStatus === 'running' || vercelStatus === 'running';
  const allDone =
    (repoMode === 'new' ? githubStatus === 'done' : true) &&
    vercelStatus === 'done';

  /**
   * Push to GitHub via SSE stream — shows real-time progress
   */
  const pushToGitHub = (): Promise<{
    success: boolean;
    repoUrl?: string;
    owner?: string;
    repoName?: string;
    error?: string;
  }> => {
    return new Promise((resolve) => {
      setGhProgress(0);
      setGhProgressLabel(t('creatingRepo'));
      setGhFileInfo('');

      fetch('/api/setup/push-to-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken, repoName, isPrivate: true }),
      })
        .then((res) => {
          const reader = res.body?.getReader();
          if (!reader) {
            resolve({ success: false, error: t('noResponseStream') });
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          const read = (): void => {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  // Stream ended without a done/error event — something went wrong
                  resolve({
                    success: false,
                    error: t('connectionLost'),
                  });
                  return;
                }

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE events from the buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  try {
                    const event = JSON.parse(line.slice(6));
                    handleGitHubEvent(event, resolve);
                  } catch {
                    // Skip malformed events
                  }
                }

                read(); // Continue reading
              })
              .catch(() => {
                resolve({
                  success: false,
                  error: t('connectionLost'),
                });
              });
          };

          read();
        })
        .catch(() => {
          resolve({
            success: false,
            error: t('failedToConnect'),
          });
        });
    });
  };

  const handleGitHubEvent = (
    event: Record<string, unknown>,
    resolve: (_result: {
      success: boolean;
      repoUrl?: string;
      owner?: string;
      repoName?: string;
      error?: string;
    }) => void
  ) => {
    switch (event.step) {
      case 'creating_repo':
        setGhProgress(5);
        setGhProgressLabel(t('creatingRepo'));
        break;

      case 'waiting_for_repo':
        setGhProgress(10);
        setGhProgressLabel(t('initializingRepo'));
        break;

      case 'reading_files':
        setGhProgress(15);
        setGhProgressLabel(t('readingFiles'));
        setGhFileInfo(`0 / ${event.total}`);
        break;

      case 'uploading': {
        const current = event.current as number;
        const total = event.total as number;
        // Uploading goes from 15% to 90%
        const uploadProgress = 15 + (current / total) * 75;
        setGhProgress(Math.round(uploadProgress));
        setGhProgressLabel(t('uploadingFiles'));
        setGhFileInfo(`${current} / ${total}`);
        break;
      }

      case 'finalizing':
        setGhProgress(95);
        setGhProgressLabel(t('finalizing'));
        setGhFileInfo('');
        break;

      case 'done':
        setGhProgress(100);
        setGhProgressLabel(tCommon('done'));
        setGhFileInfo('');
        resolve({
          success: true,
          repoUrl: event.repoUrl as string,
          owner: event.owner as string,
          repoName: event.repoName as string,
        });
        break;

      case 'error':
        resolve({ success: false, error: event.error as string });
        break;
    }
  };

  const handleDeploy = async () => {
    setError('');

    // --- Save env vars to .env.local so the local dev server works ---
    try {
      await fetch('/api/setup/save-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envVars: {
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: data.clerkPublishableKey,
            CLERK_SECRET_KEY: data.clerkSecretKey,
            NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
            NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
            NEXT_PUBLIC_SUPABASE_URL: data.supabaseUrl,
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
              data.supabasePublishableKey,
            SUPABASE_SECRET_DEFAULT_KEY: data.supabaseSecretKey,
          },
        }),
      });
    } catch {
      // Non-blocking — Vercel deploy can still proceed
    }

    let ownerForVercel = githubOwner;
    let repoForVercel = repoName;

    if (repoMode === 'new') {
      // --- Step 1: Push to GitHub (skip if already done) ---
      if (githubStatus !== 'done') {
        setGithubStatus('running');

        const result = await pushToGitHub();

        if (!result.success) {
          setError(result.error || t('failedToPush'));
          setGithubStatus('error');
          return;
        }

        setRepoUrl(result.repoUrl || '');
        setGithubOwner(result.owner || '');
        ownerForVercel = result.owner || '';
        repoForVercel = result.repoName || repoName;
        setGithubStatus('done');
      }
    } else {
      // Existing repo mode — parse owner/repo
      const parts = existingRepo.trim().split('/');
      ownerForVercel = parts[0];
      repoForVercel = parts[1];
      setRepoUrl(`https://github.com/${existingRepo.trim()}`);
    }

    // --- Step 2: Import on Vercel + set env vars + deploy ---
    setVercelStatus('running');
    try {
      const importRes = await fetch('https://api.vercel.com/v10/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoForVercel,
          framework: 'nextjs',
          gitRepository: {
            type: 'github',
            repo: `${ownerForVercel}/${repoForVercel}`,
          },
        }),
      });

      const importData = await importRes.json();

      if (!importRes.ok) {
        setError(
          importData.error?.message ||
            t('failedToImport')
        );
        setVercelStatus('error');
        return;
      }

      const projectId = importData.id;

      const envVars = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: data.clerkPublishableKey,
        CLERK_SECRET_KEY: data.clerkSecretKey,
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
        NEXT_PUBLIC_SUPABASE_URL: data.supabaseUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
          data.supabasePublishableKey,
        SUPABASE_SECRET_DEFAULT_KEY: data.supabaseSecretKey,
      };

      for (const [key, value] of Object.entries(envVars)) {
        await fetch(
          `https://api.vercel.com/v10/projects/${projectId}/env`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key,
              value,
              type: 'encrypted',
              target: ['production', 'preview', 'development'],
            }),
          }
        );
      }

      const deployRes = await fetch(
        'https://api.vercel.com/v13/deployments',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repoForVercel,
            project: projectId,
            target: 'production',
            gitSource: {
              type: 'github',
              repoId: importData.link?.repoId,
              ref: 'main',
            },
          }),
        }
      );

      if (deployRes.ok) {
        const deployData = await deployRes.json();
        setDeployUrl(
          `https://${deployData.url || deployData.alias?.[0] || `${repoForVercel}.vercel.app`}`
        );
      } else {
        setDeployUrl(`https://${repoForVercel}.vercel.app`);
      }

      setVercelStatus('done');
    } catch {
      setError(t('failedToDeploy'));
      setVercelStatus('error');
    }
  };

  // ─── Success screen ───
  if (allDone) {
    return (
      <div className="space-y-5 py-6 text-center sm:space-y-6 sm:py-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary/50 bg-primary/10">
          <Check className="size-6 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {t('youAreLive')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('liveDescription')}
          </p>
        </div>
        <div className="pt-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/80 hover:shadow-xl hover:shadow-primary/30 cursor-pointer sm:px-8 sm:py-3 sm:text-base"
          >
            {t('goToYourSite')}
            <ArrowRight className="size-4" />
          </a>
        </div>
        <div className="flex items-center justify-center gap-4 pt-1">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t('github')}
              <ExternalLink className="size-3" />
            </a>
          )}
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t('deployment')}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Main form ───
  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{t('heading')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('ready')}
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {[
            { label: t('clerkLabel'), ok: data.clerkVerified },
            { label: t('supabaseLabel'), ok: data.supabaseVerified },
            { label: t('databaseLabel'), ok: data.databaseVerified },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{label}</span>
              {ok && (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <Check className="size-3" /> {tCommon('done')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ───── Repo mode toggle ───── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t('githubSection')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRepoMode('new');
              setError('');
            }}
            disabled={isRunning}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              repoMode === 'new'
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
            }`}
          >
            {t('createNewRepo')}
          </button>
          <button
            onClick={() => {
              setRepoMode('existing');
              setError('');
            }}
            disabled={isRunning}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              repoMode === 'existing'
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
            }`}
          >
            {t('existingRepo')}
          </button>
        </div>
      </div>

      {/* ───── New repo mode ───── */}
      {repoMode === 'new' && (
        <>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('newRepoDescription')}
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
              <ol className="list-inside list-decimal space-y-2.5 text-sm text-muted-foreground">
                <li>
                  Create a free account at{' '}
                  <a
                    href="https://github.com/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
                  >
                    github.com/signup
                    <ExternalLink className="size-3" />
                  </a>{' '}
                  (skip if you already have one)
                </li>
                <li>
                  Go to{' '}
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
                  >
                    Fine-grained tokens
                    <ExternalLink className="size-3" />
                  </a>{' '}
                  (this link takes you directly there)
                </li>
                <li>
                  Click the green{' '}
                  <span className="text-highlight font-medium">Generate new token</span> button
                </li>
                <li>
                  In the{' '}
                  <span className="text-highlight font-medium">Token name</span> field, type
                  anything (e.g.{' '}
                  <span className="text-foreground">&ldquo;My site&rdquo;</span>)
                </li>
                <li>
                  Leave <span className="text-highlight font-medium">Expiration</span> as-is (30
                  days is fine)
                </li>
                <li>
                  Scroll down to{' '}
                  <span className="text-highlight font-medium">Repository access</span> &mdash; it
                  defaults to{' '}
                  <span className="text-muted-foreground">Public repositories</span>.{' '}
                  <span className="text-highlight font-medium">
                    Change it to &ldquo;All repositories&rdquo;
                  </span>
                </li>
                <li>
                  Scroll down to{' '}
                  <span className="text-highlight font-medium">Permissions</span>. You need to add
                  two permissions &mdash; make sure you add{' '}
                  <span className="text-highlight font-medium">both</span>:
                  <ul className="ml-2 mt-2 list-none space-y-2 text-muted-foreground sm:ml-5">
                    <li className="rounded border border-border bg-muted/50 px-2 py-1.5 sm:px-3 sm:py-2">
                      <span className="text-muted-foreground">①</span> Click{' '}
                      <span className="text-highlight font-medium">+ Add permissions</span>, find{' '}
                      <span className="text-highlight font-medium">Administration</span>, set it
                      to <span className="text-highlight font-medium">Read and write</span>
                    </li>
                    <li className="rounded border border-border bg-muted/50 px-2 py-1.5 sm:px-3 sm:py-2">
                      <span className="text-muted-foreground">②</span> Click{' '}
                      <span className="text-highlight font-medium">+ Add permissions</span> again,
                      find <span className="text-highlight font-medium">Contents</span>, set it to{' '}
                      <span className="text-highlight font-medium">Read and write</span>
                    </li>
                  </ul>
                  <p className="ml-2 mt-1.5 text-xs text-warning sm:ml-5">
                    You should see both Administration and Contents listed under
                    Repositories before continuing.
                  </p>
                </li>
                <li>
                  Scroll to the bottom and click the green{' '}
                  <span className="text-highlight font-medium">Generate token</span> button
                </li>
                <li>
                  Copy the token (starts with{' '}
                  <span className="font-mono text-foreground">github_pat_</span>)
                  and paste it below
                </li>
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="gh-token"
                className="text-sm font-medium text-foreground"
              >
                {t('githubToken')}
              </label>
              <input
                id="gh-token"
                type="password"
                placeholder="github_pat_..."
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value.trim());
                  setError('');
                }}
                disabled={isRunning}
                className="w-full rounded-lg border border-border bg-code px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="repo-name"
                className="text-sm font-medium text-foreground"
              >
                {t('repositoryName')}
              </label>
              <input
                id="repo-name"
                type="text"
                placeholder="my-site"
                value={repoName}
                onChange={(e) => {
                  setRepoName(
                    e.target.value
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                  );
                  setError('');
                }}
                disabled={isRunning}
                className={`w-full rounded-lg border bg-code px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 ${
                  repoCheck === 'taken'
                    ? 'border-destructive focus:border-destructive'
                    : repoCheck === 'available'
                      ? 'border-primary focus:border-primary'
                      : 'border-border focus:border-ring'
                }`}
              />
              <div className="flex items-center gap-1.5">
                {repoCheck === 'checking' && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> {t('checkingAvailability')}
                  </span>
                )}
                {repoCheck === 'available' && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Check className="size-3" /> {t('nameAvailable')}
                  </span>
                )}
                {repoCheck === 'taken' && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3" /> {t('nameTaken')}
                  </span>
                )}
                {repoCheck === 'idle' && githubToken.length < 10 && (
                  <span className="text-xs text-muted-foreground">
                    {t('pasteTokenFirst')}
                  </span>
                )}
                {repoCheck === 'idle' && githubToken.length >= 10 && (
                  <span className="text-xs text-muted-foreground">
                    {t('newPrivateRepo')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ───── Existing repo mode ───── */}
      {repoMode === 'existing' && (
        <>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t('existingRepoDescription')}
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="existing-repo"
              className="text-sm font-medium text-foreground"
            >
              {t('repository')}
            </label>
            <input
              id="existing-repo"
              type="text"
              placeholder="username/my-repo"
              value={existingRepo}
              onChange={(e) => {
                setExistingRepo(e.target.value.trim());
                setError('');
              }}
              disabled={isRunning}
              className="w-full rounded-lg border border-border bg-code px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Enter as <span className="font-mono text-foreground">owner/repo</span> (e.g.{' '}
              <span className="font-mono text-foreground">johndoe/my-site</span>)
            </p>
          </div>
        </>
      )}

      {/* ───── Vercel section ───── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t('vercelSection')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('vercelDescription')}
        </p>
        <div className="rounded border border-border bg-muted p-3 sm:p-4">
          <ol className="list-inside list-decimal space-y-2.5 text-sm text-muted-foreground">
            <li>
              Create a free account at{' '}
              <a
                href="https://vercel.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                vercel.com/signup
                <ExternalLink className="size-3" />
              </a>{' '}
              (skip if you already have one) &mdash;{' '}
              <span className="text-highlight font-medium">sign up with GitHub</span> so your
              accounts are linked
            </li>
            <li>
              Go to{' '}
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                Settings &rarr; Tokens
                <ExternalLink className="size-3" />
              </a>{' '}
              (this link takes you directly there)
            </li>
            <li>
              Under <span className="text-highlight font-medium">TOKEN NAME</span>, type
              anything (e.g.{' '}
              <span className="text-foreground">&ldquo;My site&rdquo;</span>)
            </li>
            <li>
              Leave <span className="text-highlight font-medium">SCOPE</span> as your personal
              account (the default)
            </li>
            <li>
              Set <span className="text-highlight font-medium">EXPIRATION</span> to{' '}
              <span className="text-highlight font-medium">No Expiration</span>
            </li>
            <li>
              Click <span className="text-highlight font-medium">Create Token</span> &rarr;
              copy the token and paste it below
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="v-token"
            className="text-sm font-medium text-foreground"
          >
            {t('vercelToken')}
          </label>
          <input
            id="v-token"
            type="password"
            placeholder="Your Vercel API token"
            value={vercelToken}
            onChange={(e) => {
              setVercelToken(e.target.value.trim());
              setError('');
            }}
            disabled={isRunning}
            className="w-full rounded-lg border border-border bg-code px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* ───── Progress ───── */}
      {(githubStatus !== 'idle' || vercelStatus !== 'idle') && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
          {/* GitHub progress (new repo mode only) */}
          {repoMode === 'new' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('pushToGithub')}</span>
                <StepIndicator status={githubStatus} labels={{ working: tCommon('working'), done: tCommon('done'), failed: t('failed'), pending: tCommon('pending') }} />
              </div>

              {githubStatus === 'running' && (
                <div className="space-y-1.5">
                  {/* Progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-300 ease-out"
                      style={{ width: `${ghProgress}%` }}
                    />
                  </div>
                  {/* Label + counter */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {ghProgressLabel}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {ghFileInfo && ghFileInfo}
                      {!ghFileInfo && ghProgress > 0 && `${ghProgress}%`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vercel progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('deployToVercel')}</span>
            <StepIndicator status={vercelStatus} labels={{ working: tCommon('working'), done: tCommon('done'), failed: t('failed'), pending: tCommon('pending') }} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 border-t border-border pt-4 xs:flex-row xs:items-center xs:justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isRunning}>
          <ArrowLeft className="mr-1.5 size-3.5" /> {tCommon('back')}
        </Button>

        <Button
          onClick={handleDeploy}
          disabled={!canDeploy || isRunning}
          variant="outline"
          className="bg-foreground text-background hover:bg-foreground/80 hover:text-background"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" /> {t('deploying')}
            </span>
          ) : githubStatus === 'error' || vercelStatus === 'error' ? (
            tCommon('retry')
          ) : (
            t('deploy')
          )}
        </Button>
      </div>
    </div>
  );
}

function StepIndicator({ status, labels }: { status: StepStatus; labels: { working: string; done: string; failed: string; pending: string } }) {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> {labels.working}
        </span>
      );
    case 'done':
      return (
        <span className="flex items-center gap-1.5 text-xs text-primary">
          <Check className="size-3" /> {labels.done}
        </span>
      );
    case 'error':
      return <span className="text-xs text-destructive">{labels.failed}</span>;
    default:
      return <span className="text-xs text-muted-foreground">{labels.pending}</span>;
  }
}
