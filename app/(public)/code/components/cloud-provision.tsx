'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  Cloud,
  EyeIcon,
  EyeOffIcon,
  Key,
  Loader2,
  Play,
  Terminal,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useCloudMachine,
  type CloudMachine,
  type ProvisionOptions,
} from '@/hooks/useCloudMachine';

// ── Types ────────────────────────────────────────────────────

interface CloudProvisionProps {
  onConnected: (_bridgeUrl: string, _bridgeApiKey: string) => void;
  onManualSetup: () => void;
}

type AuthTab = 'cli' | 'sdk';

const TEMPLATES = [
  { value: '', label: 'Empty workspace' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'vite-react', label: 'Vite + React' },
  { value: 'vanilla', label: 'Vanilla HTML/JS' },
  { value: 'git', label: 'Clone from Git' },
] as const;

const PROVISION_STEPS = [
  { key: 'provisioning', label: 'Creating cloud app' },
  { key: 'starting', label: 'Starting machine' },
  { key: 'running', label: 'Verifying health' },
] as const;

// ── Component ────────────────────────────────────────────────

export function CloudProvision({ onConnected, onManualSetup }: CloudProvisionProps) {
  const {
    machine,
    isLoading,
    isWorking,
    error,
    provision,
    start,
    // stop,
    destroy,
  } = useCloudMachine();

  // ── Auto-connect when machine becomes running ────────────
  if (machine?.status === 'running' && machine.bridgeUrl && machine.bridgeApiKey) {
    // Schedule this for after render to avoid calling during render
    setTimeout(() => onConnected(machine.bridgeUrl!, machine.bridgeApiKey!), 0);
  }

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Provisioning / Starting ──────────────────────────────
  if (machine?.status === 'provisioning' || machine?.status === 'starting') {
    return <ProvisioningView machine={machine} />;
  }

  // ── Stopped ──────────────────────────────────────────────
  if (machine?.status === 'stopped') {
    return (
      <StoppedView
        machine={machine}
        onStart={start}
        onDestroy={destroy}
        isWorking={isWorking}
        error={error}
      />
    );
  }

  // ── Error state with existing machine ────────────────────
  if (machine?.status === 'error') {
    return (
      <ErrorView
        machine={machine}
        onDestroy={destroy}
        isWorking={isWorking}
        error={error}
      />
    );
  }

  // ── No machine — show setup form ─────────────────────────
  return (
    <SetupForm
      onProvision={provision}
      onManualSetup={onManualSetup}
      isWorking={isWorking}
      error={error}
    />
  );
}

// ── Setup Form ───────────────────────────────────────────────

function SetupForm({
  onProvision,
  onManualSetup,
  isWorking,
  error,
}: {
  onProvision: (_opts: ProvisionOptions) => Promise<void>;
  onManualSetup: () => void;
  isWorking: boolean;
  error: string | null;
}) {
  const [authTab, setAuthTab] = useState<AuthTab>('cli');
  const [claudeAuthJson, setClaudeAuthJson] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [templateValue, setTemplateValue] = useState('');
  const [gitRepoUrl, setGitRepoUrl] = useState('');

  const isGitTemplate = templateValue === 'git';
  const templateName = isGitTemplate ? '' : templateValue;

  const canSubmit =
    !isWorking &&
    ((authTab === 'cli' && claudeAuthJson.trim().length > 0) ||
      (authTab === 'sdk' && anthropicApiKey.trim().length > 0)) &&
    (!isGitTemplate || gitRepoUrl.trim().length > 0);

  const handleLaunch = () => {
    onProvision({
      claudeMode: authTab,
      claudeAuthJson: authTab === 'cli' ? claudeAuthJson.trim() : undefined,
      anthropicApiKey: authTab === 'sdk' ? anthropicApiKey.trim() : undefined,
      templateName: templateName || undefined,
      gitRepoUrl: isGitTemplate ? gitRepoUrl.trim() : undefined,
    });
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/6 bg-card/30 p-6 backdrop-blur-sm">
        {/* Header */}
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Image src="/logo.webp" alt="Anubix logo" width={120} height={120} />
          </div>
          <h2 className="text-xl font-bold">Launch Cloud Environment</h2>
          <p className="text-sm text-muted-foreground">
            Your own cloud dev environment with Claude Code, powered by Fly.io
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Auth tabs */}
        <div className="space-y-4">
          <div className="flex rounded-lg border border-border/30 p-0.5">
            <button
              onClick={() => setAuthTab('cli')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                authTab === 'cli'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Terminal className="size-3" />
              Claude Subscription
            </button>
            <button
              onClick={() => setAuthTab('sdk')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                authTab === 'sdk'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Key className="size-3" />
              API Key
            </button>
          </div>

          {/* CLI mode */}
          {authTab === 'cli' && (
            <div className="space-y-2">
              <Label htmlFor="claude-auth">Claude Code Credentials</Label>
              <p className="text-xs text-muted-foreground">
                Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">claude /login</code> in
                your terminal, then paste the contents of{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">~/.config/claude-code/auth.json</code>
              </p>
              <Textarea
                id="claude-auth"
                value={claudeAuthJson}
                onChange={(e) => setClaudeAuthJson(e.target.value)}
                placeholder='{"token": "..."}'
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground/70">
                Uses your Claude Pro/Max subscription. No API charges.
              </p>
            </div>
          )}

          {/* SDK mode */}
          {authTab === 'sdk' && (
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <div className="relative">
                <Input
                  id="anthropic-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey((p) => !p)}
                >
                  {showApiKey ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Pay per token. Your key is encrypted and stored securely.
              </p>
            </div>
          )}

          {/* Template selector */}
          <div className="space-y-2">
            <Label htmlFor="template">Project Template</Label>
            <select
              id="template"
              value={templateValue}
              onChange={(e) => setTemplateValue(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Git URL (shown when git template selected) */}
          {isGitTemplate && (
            <div className="space-y-2">
              <Label htmlFor="git-url">Git Repository URL</Label>
              <Input
                id="git-url"
                value={gitRepoUrl}
                onChange={(e) => setGitRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
              />
            </div>
          )}

          {/* Launch button */}
          <Button onClick={handleLaunch} disabled={!canSubmit} className="w-full gap-2">
            {isWorking ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Cloud className="size-4" />
                Launch Environment
              </>
            )}
          </Button>
        </div>

        {/* Manual setup link */}
        <div className="text-center">
          <button
            onClick={onManualSetup}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Or connect to your own bridge &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Provisioning View ────────────────────────────────────────

function ProvisioningView({ machine }: { machine: CloudMachine }) {
  const currentStep =
    machine.status === 'provisioning' ? 0 : machine.status === 'starting' ? 1 : 2;

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/6 bg-card/30 p-6 backdrop-blur-sm">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Cloud className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Setting up your environment</h2>
          <p className="text-sm text-muted-foreground">This usually takes 10-30 seconds...</p>
        </div>

        <div className="space-y-3">
          {PROVISION_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border-2 text-xs font-medium',
                  i < currentStep && 'border-primary bg-primary text-primary-foreground',
                  i === currentStep && 'border-primary text-primary',
                  i > currentStep && 'border-border text-muted-foreground',
                )}
              >
                {i < currentStep ? (
                  <Check className="size-3.5" />
                ) : i === currentStep ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm',
                  i <= currentStep ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stopped View ─────────────────────────────────────────────

function StoppedView({
  machine,
  onStart,
  onDestroy,
  isWorking,
  error,
}: {
  machine: CloudMachine;
  onStart: () => Promise<void>;
  onDestroy: () => Promise<void>;
  isWorking: boolean;
  error: string | null;
}) {
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/6 bg-card/30 p-6 backdrop-blur-sm">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-warning/10">
            <Cloud className="size-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold">Environment Paused</h2>
          <p className="text-sm text-muted-foreground">
            Your workspace is saved. Resume to continue where you left off.
          </p>
          {machine.previewUrl && (
            <p className="text-xs text-muted-foreground/70">
              Region: {machine.region} &middot; Template: {machine.templateName || 'empty'}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={onStart} disabled={isWorking} className="w-full gap-2">
            {isWorking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Resume Environment
          </Button>

          {confirmDestroy ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => { onDestroy(); setConfirmDestroy(false); }}
                disabled={isWorking}
                className="flex-1 gap-2"
              >
                <Trash2 className="size-4" />
                Confirm Destroy
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDestroy(false)}
                disabled={isWorking}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setConfirmDestroy(true)}
              disabled={isWorking}
              className="w-full gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Destroy &amp; Start Fresh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Error View ───────────────────────────────────────────────

function ErrorView({
  machine,
  onDestroy,
  isWorking,
  error: opError,
}: {
  machine: CloudMachine;
  onDestroy: () => Promise<void>;
  isWorking: boolean;
  error: string | null;
}) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/6 bg-card/30 p-6 backdrop-blur-sm">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {machine.errorMessage || opError || 'An error occurred during provisioning.'}
          </p>
        </div>

        <Button
          variant="destructive"
          onClick={onDestroy}
          disabled={isWorking}
          className="w-full gap-2"
        >
          {isWorking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Destroy &amp; Try Again
        </Button>
      </div>
    </div>
  );
}
