'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';

import type { SetupData } from './setup-wizard';

interface DeployStepProps {
  data: SetupData;
  onBack: () => void;
}

type StepStatus = 'idle' | 'running' | 'done' | 'error';
type RepoCheck = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export function DeployStep({ data, onBack }: DeployStepProps) {
  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState('my-site');
  const [vercelToken, setVercelToken] = useState('');

  const [githubStatus, setGithubStatus] = useState<StepStatus>('idle');
  const [vercelStatus, setVercelStatus] = useState<StepStatus>('idle');

  const [repoUrl, setRepoUrl] = useState('');
  const [deployUrl, setDeployUrl] = useState('');
  const [error, setError] = useState('');

  // Internal state for passing data between steps
  const [githubOwner, setGithubOwner] = useState('');

  // Repo name availability check
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

  // Debounced repo name availability check
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
    checkRepoName(repoName, githubOwner);
  }, [repoName, githubOwner, checkRepoName]);

  const canDeploy =
    githubToken.length > 10 &&
    repoName.length > 1 &&
    vercelToken.length > 10 &&
    (repoCheck !== 'taken' || githubStatus === 'done');

  const isRunning = githubStatus === 'running' || vercelStatus === 'running';
  const allDone = githubStatus === 'done' && vercelStatus === 'done';

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
      setGhProgressLabel('Creating repository...');
      setGhFileInfo('');

      fetch('/api/setup/push-to-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken, repoName, isPrivate: true }),
      })
        .then((res) => {
          const reader = res.body?.getReader();
          if (!reader) {
            resolve({ success: false, error: 'No response stream' });
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
                    error: 'Connection lost. Please try again.',
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
                  error: 'Connection lost. Please try again.',
                });
              });
          };

          read();
        })
        .catch(() => {
          resolve({
            success: false,
            error: 'Failed to connect. Please try again.',
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
        setGhProgressLabel('Creating repository...');
        break;

      case 'waiting_for_repo':
        setGhProgress(10);
        setGhProgressLabel('Initializing repository...');
        break;

      case 'reading_files':
        setGhProgress(15);
        setGhProgressLabel('Reading files...');
        setGhFileInfo(`0 / ${event.total}`);
        break;

      case 'uploading': {
        const current = event.current as number;
        const total = event.total as number;
        // Uploading goes from 15% to 90%
        const uploadProgress = 15 + (current / total) * 75;
        setGhProgress(Math.round(uploadProgress));
        setGhProgressLabel('Uploading files...');
        setGhFileInfo(`${current} / ${total}`);
        break;
      }

      case 'finalizing':
        setGhProgress(95);
        setGhProgressLabel('Finalizing...');
        setGhFileInfo('');
        break;

      case 'done':
        setGhProgress(100);
        setGhProgressLabel('Done!');
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

    // --- Step 1: Push to GitHub (skip if already done) ---
    if (githubStatus !== 'done') {
      setGithubStatus('running');

      const result = await pushToGitHub();

      if (!result.success) {
        setError(result.error || 'Failed to push to GitHub.');
        setGithubStatus('error');
        return;
      }

      setRepoUrl(result.repoUrl || '');
      setGithubOwner(result.owner || '');
      setGithubStatus('done');
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
          name: repoName,
          framework: 'nextjs',
          gitRepository: {
            type: 'github',
            repo: `${githubOwner || (await getGithubOwner())}/${repoName}`,
          },
        }),
      });

      const importData = await importRes.json();

      if (!importRes.ok) {
        setError(
          importData.error?.message ||
            'Failed to import repo on Vercel. Make sure your Vercel account is connected to GitHub.'
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
            name: repoName,
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
          `https://${deployData.url || deployData.alias?.[0] || `${repoName}.vercel.app`}`
        );
      } else {
        setDeployUrl(`https://${repoName}.vercel.app`);
      }

      setVercelStatus('done');
    } catch {
      setError('Failed to deploy to Vercel. Try again.');
      setVercelStatus('error');
    }
  };

  const getGithubOwner = async (): Promise<string> => {
    if (githubOwner) return githubOwner;
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubToken}` },
    });
    const user = await res.json();
    setGithubOwner(user.login);
    return user.login;
  };

  // ─── Success screen ───
  if (allDone) {
    return (
      <div className="space-y-6 py-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-emerald-900 bg-emerald-950/50">
          <Check className="size-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">
            You&rsquo;re live!
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Your code is on GitHub and Vercel is building your site.
            It&rsquo;ll be ready in about 60 seconds.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white underline underline-offset-4 hover:text-neutral-300"
            >
              View on GitHub
              <ExternalLink className="size-3" />
            </a>
          )}
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white underline underline-offset-4 hover:text-neutral-300"
            >
              View deployment
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Main form ───
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-white">Deploy</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Push to GitHub and deploy to Vercel &mdash; all in one click.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded border border-neutral-800 bg-neutral-900/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-600">
          Ready
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {[
            { label: 'Clerk', ok: data.clerkVerified },
            { label: 'Supabase', ok: data.supabaseVerified },
            { label: 'Database', ok: data.databaseVerified },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-neutral-400">{label}</span>
              {ok && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check className="size-3" /> Done
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ───── GitHub section ───── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-300">1. GitHub</h3>
        <p className="text-xs text-neutral-600">
          GitHub stores your code. We&rsquo;ll create a private repository for
          you.
        </p>
        <div className="rounded border border-neutral-800 bg-neutral-900/50 p-4">
          <ol className="list-inside list-decimal space-y-2.5 text-sm text-neutral-400">
            <li>
              Create a free account at{' '}
              <a
                href="https://github.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white underline underline-offset-4 hover:text-neutral-300"
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
                className="inline-flex items-center gap-1 text-white underline underline-offset-4 hover:text-neutral-300"
              >
                Fine-grained tokens
                <ExternalLink className="size-3" />
              </a>{' '}
              (this link takes you directly there)
            </li>
            <li>
              Click the green{' '}
              <span className="text-white">Generate new token</span> button
            </li>
            <li>
              In the{' '}
              <span className="text-white">Token name</span> field, type
              anything (e.g.{' '}
              <span className="text-neutral-300">&ldquo;My site&rdquo;</span>)
            </li>
            <li>
              Leave <span className="text-white">Expiration</span> as-is (30
              days is fine)
            </li>
            <li>
              Scroll down to{' '}
              <span className="text-white">Repository access</span> &mdash; it
              defaults to{' '}
              <span className="text-neutral-500">Public repositories</span>.{' '}
              <span className="text-white">
                Change it to &ldquo;All repositories&rdquo;
              </span>
            </li>
            <li>
              Scroll down to{' '}
              <span className="text-white">Permissions</span>. You need to add
              two permissions &mdash; make sure you add{' '}
              <span className="text-white">both</span>:
              <ul className="ml-5 mt-2 list-none space-y-2 text-neutral-400">
                <li className="rounded border border-neutral-800 bg-black/50 px-3 py-2">
                  <span className="text-neutral-500">①</span> Click{' '}
                  <span className="text-white">+ Add permissions</span>, find{' '}
                  <span className="text-white">Administration</span>, set it
                  to <span className="text-white">Read and write</span>
                </li>
                <li className="rounded border border-neutral-800 bg-black/50 px-3 py-2">
                  <span className="text-neutral-500">②</span> Click{' '}
                  <span className="text-white">+ Add permissions</span> again,
                  find <span className="text-white">Contents</span>, set it to{' '}
                  <span className="text-white">Read and write</span>
                </li>
              </ul>
              <p className="ml-5 mt-1.5 text-xs text-yellow-500/80">
                You should see both Administration and Contents listed under
                Repositories before continuing.
              </p>
            </li>
            <li>
              Scroll to the bottom and click the green{' '}
              <span className="text-white">Generate token</span> button
            </li>
            <li>
              Copy the token (starts with{' '}
              <span className="font-mono text-neutral-300">github_pat_</span>)
              and paste it below
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="gh-token"
            className="text-sm font-medium text-neutral-300"
          >
            GitHub Token
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
            className="w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="repo-name"
            className="text-sm font-medium text-neutral-300"
          >
            Repository Name
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
            className={`w-full rounded border bg-black px-3 py-2 text-sm text-white placeholder:text-neutral-700 focus:outline-none disabled:opacity-50 ${
              repoCheck === 'taken'
                ? 'border-red-800 focus:border-red-600'
                : repoCheck === 'available'
                  ? 'border-emerald-800 focus:border-emerald-600'
                  : 'border-neutral-800 focus:border-neutral-600'
            }`}
          />
          <div className="flex items-center gap-1.5">
            {repoCheck === 'checking' && (
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <Loader2 className="size-3 animate-spin" /> Checking
                availability...
              </span>
            )}
            {repoCheck === 'available' && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check className="size-3" /> Name is available
              </span>
            )}
            {repoCheck === 'taken' && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="size-3" /> Name already taken &mdash;
                choose a different name
              </span>
            )}
            {repoCheck === 'idle' && githubToken.length < 10 && (
              <span className="text-xs text-neutral-600">
                Paste your GitHub token first to check name availability
              </span>
            )}
            {repoCheck === 'idle' && githubToken.length >= 10 && (
              <span className="text-xs text-neutral-600">
                A new private repository will be created on your GitHub
                account.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ───── Vercel section ───── */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-300">2. Vercel</h3>
        <p className="text-xs text-neutral-600">
          Vercel hosts your site and makes it available at a public URL.
        </p>
        <div className="rounded border border-neutral-800 bg-neutral-900/50 p-4">
          <ol className="list-inside list-decimal space-y-2.5 text-sm text-neutral-400">
            <li>
              Create a free account at{' '}
              <a
                href="https://vercel.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white underline underline-offset-4 hover:text-neutral-300"
              >
                vercel.com/signup
                <ExternalLink className="size-3" />
              </a>{' '}
              (skip if you already have one) &mdash;{' '}
              <span className="text-white">sign up with GitHub</span> so your
              accounts are linked
            </li>
            <li>
              Go to{' '}
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white underline underline-offset-4 hover:text-neutral-300"
              >
                Settings &rarr; Tokens
                <ExternalLink className="size-3" />
              </a>{' '}
              (this link takes you directly there)
            </li>
            <li>
              Under <span className="text-white">TOKEN NAME</span>, type
              anything (e.g.{' '}
              <span className="text-neutral-300">&ldquo;My site&rdquo;</span>)
            </li>
            <li>
              Leave <span className="text-white">SCOPE</span> as your personal
              account (the default)
            </li>
            <li>
              Set <span className="text-white">EXPIRATION</span> to{' '}
              <span className="text-white">No Expiration</span>
            </li>
            <li>
              Click <span className="text-white">Create Token</span> &rarr;
              copy the token and paste it below
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="v-token"
            className="text-sm font-medium text-neutral-300"
          >
            Vercel Token
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
            className="w-full rounded border border-neutral-800 bg-black px-3 py-2 text-sm text-white placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* ───── Progress ───── */}
      {(githubStatus !== 'idle' || vercelStatus !== 'idle') && (
        <div className="space-y-3 rounded border border-neutral-800 bg-neutral-900/50 p-4">
          {/* GitHub progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Push to GitHub</span>
              <StepIndicator status={githubStatus} />
            </div>

            {githubStatus === 'running' && (
              <div className="space-y-1.5">
                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300 ease-out"
                    style={{ width: `${ghProgress}%` }}
                  />
                </div>
                {/* Label + counter */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    {ghProgressLabel}
                  </span>
                  <span className="text-xs tabular-nums text-neutral-600">
                    {ghFileInfo && ghFileInfo}
                    {!ghFileInfo && ghProgress > 0 && `${ghProgress}%`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Vercel progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Deploy to Vercel</span>
            <StepIndicator status={vercelStatus} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
        <button
          onClick={onBack}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded px-3 py-2 text-sm text-neutral-500 hover:text-white disabled:opacity-40"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>

        <button
          onClick={handleDeploy}
          disabled={!canDeploy || isRunning}
          className="rounded bg-white px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" /> Deploying
            </span>
          ) : githubStatus === 'error' || vercelStatus === 'error' ? (
            'Retry'
          ) : (
            'Deploy'
          )}
        </button>
      </div>
    </div>
  );
}

function StepIndicator({ status }: { status: StepStatus }) {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Loader2 className="size-3 animate-spin" /> Working
        </span>
      );
    case 'done':
      return (
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <Check className="size-3" /> Done
        </span>
      );
    case 'error':
      return <span className="text-xs text-red-400">Failed</span>;
    default:
      return <span className="text-xs text-neutral-600">Pending</span>;
  }
}
