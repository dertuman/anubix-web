'use client';

import { useEffect, useRef, useState } from 'react';
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
  ExternalLink,
  Minus,
  Play,
  Plus,
  Search,
  Terminal,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { parseEnvString, type EnvVarEntry } from '@/lib/env-utils';
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
import { useCloudMachineContext } from '../../workspace/context/cloud-machine-context';
import type { CloudMachine, ProvisionOptions } from '@/hooks/useCloudMachine';
import { useClaudeConnection } from '@/hooks/useClaudeConnection';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import { useGitHubRepos, type GitHubRepo } from '@/hooks/useGitHubRepos';

// ── Types ────────────────────────────────────────────────────

interface CloudProvisionProps {
  onConnected: (_bridgeUrl: string, _bridgeApiKey: string) => void;
  onManualSetup: () => void;
}

/** Key for persisting extra repos to clone after provisioning */
const EXTRA_REPOS_KEY = 'anubix-extra-repos-to-clone';

const TEMPLATES = [
  { value: 'talkartech', label: 'Talkartech Fullstack (Recommended)', gitUrl: 'https://github.com/dertuman/talkartech-fullstack-template-supabase.git' },
  { value: '', label: 'Empty workspace', gitUrl: '' },
  { value: 'nextjs', label: 'Next.js', gitUrl: '' },
  { value: 'vite-react', label: 'Vite + React', gitUrl: '' },
  { value: 'vanilla', label: 'Vanilla HTML/JS', gitUrl: '' },
  { value: 'git', label: 'Clone from Git URL', gitUrl: '' },
] as const;

const PROVISION_STEPS = [
  { key: 'provisioning', label: 'Creating cloud app', hint: 'Setting up infrastructure' },
  { key: 'starting', label: 'Starting machine', hint: 'Installing dependencies' },
  { key: 'running', label: 'Verifying connection', hint: 'Almost there' },
] as const;

// ── Component ────────────────────────────────────────────────

export function CloudProvision({ onConnected, onManualSetup }: CloudProvisionProps) {
  const {
    machine,
    isLoading,
    isWorking,
    error,
    errorCode,
    provision,
    start,
    // stop,
    destroy,
  } = useCloudMachineContext();

  // ── Auto-connect when machine becomes running ────────────
  const autoConnectedRef = useRef(false);
  useEffect(() => {
    if (autoConnectedRef.current) return;
    if (machine?.status !== 'running' || !machine.bridgeUrl || !machine.bridgeApiKey) return;
    autoConnectedRef.current = true;

    // Clone any extra repos that were selected during provisioning
    const extraReposJson = sessionStorage.getItem(EXTRA_REPOS_KEY);
    if (extraReposJson) {
      sessionStorage.removeItem(EXTRA_REPOS_KEY);
      try {
        const urls = JSON.parse(extraReposJson) as string[];
        for (const url of urls) {
          fetch('/api/cloud/repos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          }).catch(() => { /* best effort */ });
        }
      } catch { /* ignore */ }
    }

    onConnected(machine.bridgeUrl, machine.bridgeApiKey);
  }, [machine?.status, machine?.bridgeUrl, machine?.bridgeApiKey, onConnected]);

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
        errorCode={errorCode}
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
      errorCode={errorCode}
    />
  );
}

// ── Setup Form ───────────────────────────────────────────────

function SetupForm({
  onProvision,
  onManualSetup,
  isWorking,
  error,
  errorCode,
}: {
  onProvision: (_opts: ProvisionOptions) => Promise<void>;
  onManualSetup: () => void;
  isWorking: boolean;
  error: string | null;
  errorCode: string | null;
}) {
  const [templateValue, setTemplateValue] = useState('talkartech');
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [selectedGitRepos, setSelectedGitRepos] = useState<GitHubRepo[]>([]);
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);
  const [manualGitUrl, setManualGitUrl] = useState(false);
  const [savingEnvVars, setSavingEnvVars] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [showEnvVars, setShowEnvVars] = useState(false);

  const claude = useClaudeConnection();
  const github = useGitHubConnection();
  const isGitTemplate = templateValue === 'git';
  const githubRepos = useGitHubRepos(isGitTemplate && github.isConnected);

  // Inline Claude auth form state
  const [showClaudeForm, setShowClaudeForm] = useState(false);
  const [showManualAuth, setShowManualAuth] = useState(false);
  const [oauthStep, setOauthStep] = useState<'idle' | 'waiting_for_code'>('idle');
  const [oauthCode, setOauthCode] = useState('');
  const [claudeAuthTab, setClaudeAuthTab] = useState<'cli' | 'sdk'>('cli');
  const [claudeAuthJson, setClaudeAuthJson] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [claudeSaving, setClaudeSaving] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);

  const canSaveClaude =
    (claudeAuthTab === 'cli' && claudeAuthJson.trim().length > 0) ||
    (claudeAuthTab === 'sdk' && anthropicApiKey.trim().length > 0);

  const handleClaudeSave = async () => {
    setClaudeSaving(true);
    setClaudeError(null);
    try {
      await claude.save({
        claudeMode: claudeAuthTab,
        claudeAuthJson: claudeAuthTab === 'cli' ? claudeAuthJson.trim() : undefined,
        anthropicApiKey: claudeAuthTab === 'sdk' ? anthropicApiKey.trim() : undefined,
      });
      setShowClaudeForm(false);
      setClaudeAuthJson('');
      setAnthropicApiKey('');
    } catch (err) {
      setClaudeError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setClaudeSaving(false);
    }
  };

  const realTemplateValue = templateValue === '__empty' ? '' : templateValue;
  const selectedTemplate = TEMPLATES.find(t => t.value === realTemplateValue);
  const isPresetGit = !!(selectedTemplate?.gitUrl);
  const templateName = (isGitTemplate || isPresetGit) ? '' : realTemplateValue;
  // Use first selected GitHub repo or manual URL
  const primaryGitUrl = selectedGitRepos.length > 0
    ? selectedGitRepos[0].clone_url
    : gitRepoUrl.trim();
  const resolvedGitUrl = isPresetGit ? selectedTemplate!.gitUrl : (isGitTemplate ? primaryGitUrl : '');

  const hasGitRepo = isGitTemplate
    ? (selectedGitRepos.length > 0 || gitRepoUrl.trim().length > 0)
    : true;
  const canSubmit =
    !isWorking &&
    !savingEnvVars &&
    hasGitRepo;

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

  const handleEnvVarPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseEnvString(text);
    if (parsed.length > 0) {
      e.preventDefault();
      mergeEnvVars(parsed);
      setPasteInput('');
    }
  };

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
    setSelectedGitRepos((prev) => {
      const exists = prev.some((r) => r.full_name === repo.full_name);
      if (exists) return prev.filter((r) => r.full_name !== repo.full_name);
      return [...prev, repo];
    });
  };

  const removeSelectedRepo = (fullName: string) => {
    setSelectedGitRepos((prev) => prev.filter((r) => r.full_name !== fullName));
  };

  const handleLaunch = async () => {
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

    // If multiple GitHub repos selected, store extras for post-provisioning cloning
    if (selectedGitRepos.length > 1) {
      const extraUrls = selectedGitRepos.slice(1).map((r) => r.clone_url);
      sessionStorage.setItem(EXTRA_REPOS_KEY, JSON.stringify(extraUrls));
    }

    onProvision({
      templateName: templateName || undefined,
      gitRepoUrl: resolvedGitUrl || undefined,
    });
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-3 sm:p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border/6 bg-card/30 p-4 backdrop-blur-sm sm:space-y-5 sm:p-6">
        {/* Header */}
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Image src="/logo.webp" alt="Anubix logo" width={80} height={80} />
          </div>
          <h2 className="text-xl font-bold">Launch Cloud Environment</h2>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm text-destructive">{error}</p>
              {errorCode === 'SUBSCRIPTION_REQUIRED' && (
                <a
                  href="/#pricing"
                  className="inline-block text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  View plans
                </a>
              )}
            </div>
          </div>
        )}

        {/* Connection status badges */}
        <div className="space-y-2">
          {/* Claude connection */}
          {claude.isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking Claude...
            </div>
          ) : claude.isConnected ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5 text-sm">
              <div className="size-2 shrink-0 rounded-full bg-green-500" />
              <span className="flex-1">Claude {claude.mode === 'cli' ? 'Pro/Max' : 'API Key'}</span>
              <Check className="size-4 text-green-500" />
            </div>
          ) : !showClaudeForm ? (
            <button
              onClick={() => setShowClaudeForm(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-50 px-3 py-2.5 text-sm text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="flex-1 text-left">Optional: Connect Claude for AI assistance (you can connect later)</span>
              <span className="text-xs underline">Setup</span>
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connect Claude</span>
                <button
                  onClick={() => { setShowClaudeForm(false); setClaudeError(null); setShowManualAuth(false); setOauthStep('idle'); setOauthCode(''); }}
                  className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {oauthStep === 'idle' ? (
                <>
                  {/* Step 1: Open Claude authorization in new tab */}
                  <Button
                    onClick={async () => {
                      setClaudeError(null);
                      try {
                        const url = await claude.startOAuth();
                        window.open(url, '_blank', 'noopener');
                        setOauthStep('waiting_for_code');
                      } catch (err) {
                        setClaudeError(err instanceof Error ? err.message : 'Failed to start login');
                      }
                    }}
                    className="w-full gap-2"
                  >
                    <ExternalLink className="size-4" />
                    Login with Claude
                  </Button>
                </>
              ) : (
                <>
                  {/* Step 2: User pastes the authorization code */}
                  <p className="text-xs text-muted-foreground">
                    Authorize in the tab that opened, then paste the code shown on the Anthropic page below.
                  </p>
                  <Input
                    value={oauthCode}
                    onChange={(e) => setOauthCode(e.target.value)}
                    placeholder="Paste authorization code here..."
                    className="font-mono text-xs"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      setClaudeSaving(true);
                      setClaudeError(null);
                      try {
                        await claude.exchangeCode(oauthCode);
                        setShowClaudeForm(false);
                        setOauthStep('idle');
                        setOauthCode('');
                      } catch (err) {
                        setClaudeError(err instanceof Error ? err.message : 'Failed to exchange code');
                      } finally {
                        setClaudeSaving(false);
                      }
                    }}
                    disabled={claudeSaving || oauthCode.trim().length === 0}
                    className="w-full gap-1"
                  >
                    {claudeSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Connect
                  </Button>
                  <button
                    onClick={() => { setOauthStep('idle'); setOauthCode(''); setClaudeError(null); }}
                    className="w-full rounded-md py-1 text-center text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Start over
                  </button>
                </>
              )}

              {claudeError && (
                <p className="text-xs text-destructive">{claudeError}</p>
              )}

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-[11px] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border/30" />
              </div>

              {/* Manual credentials toggle */}
              <button
                onClick={() => setShowManualAuth(!showManualAuth)}
                className="w-full rounded-md py-1 text-center text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showManualAuth ? 'Hide manual options' : 'Enter credentials manually'}
              </button>

              {showManualAuth && (
                <>
                  {/* Mode tabs */}
                  <div className="flex rounded-lg border border-border/30 p-0.5">
                    <button
                      onClick={() => setClaudeAuthTab('cli')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                        claudeAuthTab === 'cli'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Terminal className="size-3" />
                      Pro/Max
                    </button>
                    <button
                      onClick={() => setClaudeAuthTab('sdk')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                        claudeAuthTab === 'sdk'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Key className="size-3" />
                      API Key
                    </button>
                  </div>

                  {claudeAuthTab === 'cli' ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">claude /login</code> in
                        your terminal, then paste the contents of{' '}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">~/.claude/.credentials.json</code>
                      </p>
                      <Textarea
                        value={claudeAuthJson}
                        onChange={(e) => setClaudeAuthJson(e.target.value)}
                        placeholder={'{"claudeAiOauth":{"accessToken":"...","refreshToken":"..."}}'}
                        rows={3}
                        className="font-mono text-xs"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
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
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleClaudeSave}
                    disabled={claudeSaving || !canSaveClaude}
                    className="w-full gap-1"
                  >
                    {claudeSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Save
                  </Button>
                </>
              )}
            </div>
          )}

          {/* GitHub connection */}
          {github.isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking GitHub...
            </div>
          ) : github.isConnected ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5 text-sm">
              <Github className="size-4 shrink-0" />
              <span className="flex-1 truncate">{github.username}</span>
              <Check className="size-4 text-green-500" />
            </div>
          ) : (
            <button
              onClick={() => github.connect('/workspace')}
              className="flex w-full items-center gap-2 rounded-lg border border-border/30 px-3 py-2.5 text-sm text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            >
              <Github className="size-4 shrink-0" />
              <span className="flex-1 text-left">Connect GitHub (optional)</span>
              <Plus className="size-4" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Template selector */}
          <div className="space-y-2">
            <Label>Project Template</Label>
            <Select
              value={templateValue}
              onValueChange={(val) => {
                setTemplateValue(val);
                setGitRepoUrl('');
                setSelectedGitRepos([]);
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

          {/* Git URL / Repo picker */}
          {isGitTemplate && (
            <div className="space-y-2">
              <Label htmlFor="git-url">
                Git {selectedGitRepos.length > 1 ? 'Repositories' : 'Repository'}
                {selectedGitRepos.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    ({selectedGitRepos.length} selected)
                  </span>
                )}
              </Label>

              {github.isConnected && !manualGitUrl ? (
                <>
                  {/* Selected repos chips */}
                  {selectedGitRepos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedGitRepos.map((repo) => (
                        <span
                          key={repo.full_name}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary"
                        >
                          {repo.full_name.split('/').pop()}
                          <button
                            onClick={() => removeSelectedRepo(repo.full_name)}
                            className="ml-0.5 rounded-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Minus className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

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
                          githubRepos.filteredRepos.slice(0, 20).map((repo) => {
                            const isSelected = selectedGitRepos.some((r) => r.full_name === repo.full_name);
                            return (
                              <button
                                key={repo.full_name}
                                onClick={() => handleSelectRepo(repo)}
                                className={cn(
                                  'flex w-full items-center gap-2 border-b border-border/10 px-3 py-2 text-left text-sm last:border-0 transition-colors',
                                  isSelected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/50',
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded border',
                                    isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-muted-foreground/30',
                                  )}
                                >
                                  {isSelected && (
                                    <Check className="size-3" />
                                  )}
                                </div>
                                <span className="flex-1 truncate">{repo.full_name}</span>
                                {repo.private && (
                                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    private
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setManualGitUrl(true)}
                    className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Enter URL manually instead
                  </button>
                </>
              ) : (
                <>
                  <Input
                    id="git-url"
                    value={gitRepoUrl}
                    onChange={(e) => setGitRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                  />
                  {!github.isLoading && !github.isConnected && (
                    <button
                      onClick={() => github.connect('/workspace')}
                      className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                      className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Back to repo picker
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Environment Variables (collapsible) */}
          <div className="space-y-2">
            <button
              onClick={() => setShowEnvVars(!showEnvVars)}
              className="flex w-full items-center justify-between rounded-md px-1 py-0.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span>Environment Variables {envVars.length > 0 && `(${envVars.length})`}</span>
              <Plus className={cn('size-4 text-muted-foreground transition-transform', showEnvVars && 'rotate-45')} />
            </button>

            {showEnvVars && (
              <>
                <Textarea
                  value={pasteInput}
                  onChange={(e) => handleEnvInput(e.target.value)}
                  onPaste={handleEnvVarPaste}
                  placeholder={'Paste .env contents here'}
                  rows={2}
                  className="font-mono text-xs"
                />

                {envVars.length > 0 && (
                  <div className="space-y-2">
                    {envVars.map((envVar, i) => (
                      <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                        <Input
                          value={envVar.key}
                          onChange={(e) => setEnvVars((prev) => prev.map((v, j) => (j === i ? { ...v, key: e.target.value } : v)))}
                          placeholder="KEY"
                          className="min-w-0 flex-1 font-mono text-xs"
                        />
                        <Input
                          value={envVar.value}
                          onChange={(e) => setEnvVars((prev) => prev.map((v, j) => (j === i ? { ...v, value: e.target.value } : v)))}
                          placeholder="value"
                          className="min-w-0 flex-1 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEnvVars((prev) => prev.filter((_, j) => j !== i))}
                          className="h-8 w-8 shrink-0 p-0"
                        >
                          <Minus className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnvVars((prev) => [...prev, { key: '', value: '' }])}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Plus className="size-3" />
                  Add variable
                </Button>
              </>
            )}
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
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/6 bg-card/30 p-6 backdrop-blur-sm">
        <div className="space-y-1 text-center">
          <div className="relative mx-auto mb-3 flex size-16 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/10" style={{ animationDuration: '2s' }} />
            <span className="absolute inset-1 animate-pulse rounded-xl bg-primary/5" />
            <Cloud className="relative size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Setting up your environment</h2>
          <p className="text-sm text-muted-foreground">
            This usually takes 2-4 minutes
            <span className="ml-1.5 font-mono text-xs text-muted-foreground/70">({timeStr})</span>
          </p>
        </div>

        <div className="space-y-1">
          {PROVISION_STEPS.map((step, i) => (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                i === currentStep && 'bg-primary/5',
              )}
            >
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-all',
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
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'text-sm',
                    i <= currentStep ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {i === currentStep && (
                  <p className="text-xs text-muted-foreground/70">{step.hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${Math.min(((currentStep + 0.5) / PROVISION_STEPS.length) * 100, 95)}%` }}
          />
        </div>

        <p className="rounded-lg bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
          You can close this page — provisioning continues in the background
        </p>
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
  errorCode,
}: {
  machine: CloudMachine;
  onStart: () => Promise<void>;
  onDestroy: () => Promise<void>;
  isWorking: boolean;
  error: string | null;
  errorCode: string | null;
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
            <div className="space-y-1">
              <p className="text-sm text-destructive">{error}</p>
              {errorCode === 'SUBSCRIPTION_REQUIRED' && (
                <a
                  href="/#pricing"
                  className="inline-block text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  View plans
                </a>
              )}
            </div>
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
