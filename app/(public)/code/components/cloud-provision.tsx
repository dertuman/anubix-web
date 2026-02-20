'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  Cloud,
  EyeIcon,
  EyeOffIcon,
  Github,
  Key,
  Loader2,
  Minus,
  Play,
  Plus,
  Search,
  Terminal,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCloudMachine,
  type CloudMachine,
  type ProvisionOptions,
} from '@/hooks/useCloudMachine';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import { useGitHubRepos, type GitHubRepo } from '@/hooks/useGitHubRepos';

// ── Types ────────────────────────────────────────────────────

interface CloudProvisionProps {
  onConnected: (_bridgeUrl: string, _bridgeApiKey: string) => void;
  onManualSetup: () => void;
}

type AuthTab = 'cli' | 'sdk' | 'managed';

interface EnvVarEntry {
  key: string;
  value: string;
}

const TEMPLATES = [
  { value: 'talkartech', label: 'Talkartech Fullstack (Recommended)', gitUrl: 'https://github.com/dertuman/talkartech-fullstack-template-supabase.git' },
  { value: '', label: 'Empty workspace', gitUrl: '' },
  { value: 'nextjs', label: 'Next.js', gitUrl: '' },
  { value: 'vite-react', label: 'Vite + React', gitUrl: '' },
  { value: 'vanilla', label: 'Vanilla HTML/JS', gitUrl: '' },
  { value: 'git', label: 'Clone from Git URL', gitUrl: '' },
] as const;

const PROVISION_STEPS = [
  { key: 'provisioning', label: 'Creating cloud app' },
  { key: 'starting', label: 'Starting machine' },
  { key: 'running', label: 'Verifying health' },
] as const;

/** Parse a .env-style string into key-value pairs */
function parseEnvString(text: string): EnvVarEntry[] {
  const results: EnvVarEntry[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Handle `export KEY=value`
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }
    if (key) results.push({ key, value });
  }
  return results;
}

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
  const [templateValue, setTemplateValue] = useState('talkartech');
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);
  const [manualGitUrl, setManualGitUrl] = useState(false);
  const [savingEnvVars, setSavingEnvVars] = useState(false);

  const github = useGitHubConnection();
  const isGitTemplate = templateValue === 'git';
  const githubRepos = useGitHubRepos(isGitTemplate && github.isConnected);

  const realTemplateValue = templateValue === '__empty' ? '' : templateValue;
  const selectedTemplate = TEMPLATES.find(t => t.value === realTemplateValue);
  const isPresetGit = !!(selectedTemplate?.gitUrl);  // e.g. talkartech
  const templateName = (isGitTemplate || isPresetGit) ? '' : realTemplateValue;
  const resolvedGitUrl = isPresetGit ? selectedTemplate!.gitUrl : (isGitTemplate ? gitRepoUrl.trim() : '');

  const canSubmit =
    !isWorking &&
    !savingEnvVars &&
    authTab !== 'managed' &&
    ((authTab === 'cli' && claudeAuthJson.trim().length > 0) ||
      (authTab === 'sdk' && anthropicApiKey.trim().length > 0)) &&
    (!isGitTemplate || gitRepoUrl.trim().length > 0);

  const handleAddEnvVar = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', val: string) => {
    setEnvVars((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: val } : v)));
  };

  const [pasteInput, setPasteInput] = useState('');

  const mergeEnvVars = (parsed: EnvVarEntry[]) => {
    setEnvVars((prev) => {
      const existing = new Set(prev.map((v) => v.key));
      const merged = [...prev];
      for (const entry of parsed) {
        if (existing.has(entry.key)) {
          const idx = merged.findIndex((v) => v.key === entry.key);
          if (idx !== -1) merged[idx] = entry;
        } else {
          merged.push(entry);
          existing.add(entry.key);
        }
      }
      return merged;
    });
  };

  // Desktop: intercept paste event directly from clipboard
  const handleEnvVarPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseEnvString(text);
    if (parsed.length > 0) {
      e.preventDefault();
      mergeEnvVars(parsed);
      setPasteInput('');
    }
  };

  // Mobile fallback: auto-parse on onChange (mobile paste fires onChange, not onPaste)
  const handleEnvInput = (text: string) => {
    const parsed = parseEnvString(text);
    if (parsed.length > 0) {
      mergeEnvVars(parsed);
      setPasteInput('');
    } else {
      setPasteInput(text);
    }
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setGitRepoUrl(repo.clone_url);
    githubRepos.setSearch('');
  };

  const handleLaunch = async () => {
    // Save env vars to DB if any are set
    const validEnvVars = envVars.filter((v) => v.key.trim());
    if (validEnvVars.length > 0) {
      setSavingEnvVars(true);
      try {
        const res = await fetch('/api/cloud/env-vars', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vars: validEnvVars }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save env vars');
        }
      } catch {
        // Continue with provisioning even if env var save fails
      } finally {
        setSavingEnvVars(false);
      }
    }

    onProvision({
      claudeMode: authTab as 'cli' | 'sdk',
      claudeAuthJson: authTab === 'cli' ? claudeAuthJson.trim() : undefined,
      anthropicApiKey: authTab === 'sdk' ? anthropicApiKey.trim() : undefined,
      templateName: templateName || undefined,
      gitRepoUrl: resolvedGitUrl || undefined,
    });
  };

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto p-4 pt-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/6 bg-card/30 p-6 backdrop-blur-sm">
        {/* Header */}
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Image src="/logo.webp" alt="Anubix logo" width={100} height={100} />
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
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                authTab === 'cli'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Terminal className="size-3" />
              Pro/Max
            </button>
            <button
              onClick={() => setAuthTab('sdk')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                authTab === 'sdk'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Key className="size-3" />
              API Key
            </button>
            <button
              disabled
              className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground/50"
            >
              <Cloud className="size-3" />
              Managed (Soon)
            </button>
          </div>

          {/* CLI mode */}
          {authTab === 'cli' && (
            <div className="space-y-2">
              <Label htmlFor="claude-auth">Claude Code Credentials</Label>
              <p className="text-xs text-muted-foreground">
                Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">claude /login</code> in
                your terminal, then paste the contents of{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">~/.claude/.credentials.json</code>
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
                Uses your Claude Pro/Max subscription. No API charges. (Recommended)
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

          {/* Managed mode placeholder */}
          {authTab === 'managed' && (
            <div className="rounded-lg border border-border/30 bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No key needed &mdash; coming soon. We&apos;ll handle the API costs as part of your subscription.
              </p>
            </div>
          )}

          {/* Template selector */}
          <div className="space-y-2">
            <Label>Project Template</Label>
            <Select
              value={templateValue}
              onValueChange={(val) => {
                setTemplateValue(val);
                setGitRepoUrl('');
                setManualGitUrl(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value || '__empty'} value={t.value || '__empty'}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Git URL / Repo picker (shown when git template selected) */}
          {isGitTemplate && (
            <div className="space-y-2">
              <Label htmlFor="git-url">Git Repository</Label>

              {github.isConnected && !manualGitUrl ? (
                <>
                  {/* GitHub connected — repo picker */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Github className="size-3" />
                    <span>Connected as <strong>{github.username}</strong></span>
                  </div>

                  {/* Selected repo display */}
                  {gitRepoUrl && (
                    <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{gitRepoUrl}</span>
                      <button
                        onClick={() => setGitRepoUrl('')}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="size-3" />
                      </button>
                    </div>
                  )}

                  {/* Repo search */}
                  {!gitRepoUrl && (
                    <div className="space-y-1">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={githubRepos.search}
                          onChange={(e) => githubRepos.setSearch(e.target.value)}
                          placeholder="Search your repos..."
                          className="pl-8 text-sm"
                        />
                      </div>
                      {githubRepos.isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border/30">
                          {githubRepos.filteredRepos.length === 0 ? (
                            <p className="p-3 text-center text-xs text-muted-foreground">
                              No repos found
                            </p>
                          ) : (
                            githubRepos.filteredRepos.slice(0, 20).map((repo) => (
                              <button
                                key={repo.full_name}
                                onClick={() => handleSelectRepo(repo)}
                                className="flex w-full items-center gap-2 border-b border-border/10 px-3 py-2 text-left text-sm hover:bg-muted/50 last:border-0"
                              >
                                <span className="flex-1 truncate">{repo.full_name}</span>
                                {repo.private && (
                                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    private
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setManualGitUrl(true)}
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Enter URL manually instead
                  </button>
                </>
              ) : (
                <>
                  {/* Manual URL input */}
                  <Input
                    id="git-url"
                    value={gitRepoUrl}
                    onChange={(e) => setGitRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                  />
                  {!github.isLoading && !github.isConnected && (
                    <button
                      onClick={() => github.connect('/code')}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      <Github className="size-3" />
                      Connect GitHub for private repos
                    </button>
                  )}
                  {manualGitUrl && github.isConnected && (
                    <button
                      onClick={() => {
                        setManualGitUrl(false);
                        setGitRepoUrl('');
                      }}
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Back to repo picker
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Environment Variables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Environment Variables</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddEnvVar}
                className="h-6 gap-1 px-2 text-xs"
              >
                <Plus className="size-3" />
                Add
              </Button>
            </div>

            {/* Paste area — always visible, auto-parses on paste/change */}
            <Textarea
              value={pasteInput}
              onChange={(e) => handleEnvInput(e.target.value)}
              onPaste={handleEnvVarPaste}
              placeholder={'Paste .env contents here'}
              rows={2}
              className="font-mono text-xs"
            />

            {/* Parsed key-value rows */}
            {envVars.length > 0 && (
              <div className="space-y-2">
                {envVars.map((envVar, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={envVar.key}
                      onChange={(e) => handleEnvVarChange(i, 'key', e.target.value)}
                      placeholder="KEY"
                      className="flex-1 font-mono text-xs"
                    />
                    <Input
                      value={envVar.value}
                      onChange={(e) => handleEnvVarChange(i, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEnvVar(i)}
                      className="h-8 w-8 shrink-0 p-0"
                    >
                      <Minus className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/70">
              {envVars.length === 0
                ? 'Paste your .env file above or add variables one by one.'
                : `${envVars.length} variable${envVars.length === 1 ? '' : 's'} — written to .env.local`}
            </p>
          </div>

          {/* Launch button */}
          <Button onClick={handleLaunch} disabled={!canSubmit} className="w-full gap-2">
            {isWorking || savingEnvVars ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {savingEnvVars ? 'Saving env vars...' : 'Launching...'}
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
          <p className="text-sm text-muted-foreground">This usually takes 1-3 minutes...</p>
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
