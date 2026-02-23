'use client';

import { useState } from 'react';
import {
  Check,
  EyeIcon,
  EyeOffIcon,
  Github,
  Key,
  Loader2,
  ExternalLink,
  Terminal,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useClaudeConnection } from '@/hooks/useClaudeConnection';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';

// ── Page ─────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Manage connected services for your cloud workspaces.
        </p>
      </div>
      <Separator />
      <ClaudeCard />
      <Separator />
      <GitHubCard />
    </div>
  );
}

// ── Claude Card ─────────────────────────────────────────────

function ClaudeCard() {
  const { isConnected, mode, isLoading, startOAuth, exchangeCode, save, disconnect } = useClaudeConnection();
  const [editing, setEditing] = useState(false);
  const [showManualAuth, setShowManualAuth] = useState(false);
  const [oauthStep, setOauthStep] = useState<'idle' | 'waiting_for_code'>('idle');
  const [oauthCode, setOauthCode] = useState('');
  const [authTab, setAuthTab] = useState<'cli' | 'sdk'>('cli');
  const [claudeAuthJson, setClaudeAuthJson] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await save({
        claudeMode: authTab,
        claudeAuthJson: authTab === 'cli' ? claudeAuthJson.trim() : undefined,
        anthropicApiKey: authTab === 'sdk' ? anthropicApiKey.trim() : undefined,
      });

      // Auto-push credentials to running machine
      try {
        await fetch('/api/cloud/credentials/push', { method: 'POST' });
      } catch {
        // Best effort - don't block on failure
      }

      setEditing(false);
      setShowManualAuth(false);
      setClaudeAuthJson('');
      setAnthropicApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setEditing(false);
    setShowManualAuth(false);
    setOauthStep('idle');
    setOauthCode('');
  };

  const canSave =
    (authTab === 'cli' && claudeAuthJson.trim().length > 0) ||
    (authTab === 'sdk' && anthropicApiKey.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-border/30 bg-muted/50">
          <Terminal className="size-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium">Claude Code</h4>
          <p className="text-xs text-muted-foreground">
            Required to use cloud workspaces. Your credentials are encrypted.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking connection...
        </div>
      ) : isConnected && !editing ? (
        <div className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="size-2 rounded-full bg-green-500" />
            Connected ({mode === 'cli' ? 'Pro/Max' : 'API Key'})
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {oauthStep === 'idle' ? (
            <Button
              onClick={async () => {
                setError(null);
                try {
                  const url = await startOAuth();
                  window.open(url, '_blank', 'noopener');
                  setOauthStep('waiting_for_code');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to start login');
                }
              }}
              className="w-full gap-2"
            >
              <ExternalLink className="size-4" />
              Login with Claude
            </Button>
          ) : (
            <>
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
                  setSaving(true);
                  setError(null);
                  try {
                    await exchangeCode(oauthCode);
                    setEditing(false);
                    setOauthStep('idle');
                    setOauthCode('');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to exchange code');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || oauthCode.trim().length === 0}
                className="w-full gap-1"
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Connect
              </Button>
              <button
                onClick={() => { setOauthStep('idle'); setOauthCode(''); setError(null); }}
                className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Start over
              </button>
            </>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
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
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {showManualAuth ? 'Hide manual options' : 'Enter credentials manually'}
          </button>

          {showManualAuth && (
            <>
              {/* Mode tabs */}
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
              </div>

              {authTab === 'cli' ? (
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
                    placeholder={'{"claudeAiOauth":{"accessToken":"...","refreshToken":"..."}}'}
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>
              ) : (
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
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !canSave}
                  className="gap-1"
                >
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Save
                </Button>
                {editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditing(false); setShowManualAuth(false); setOauthStep('idle'); setOauthCode(''); }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── GitHub Card ──────────────────────────────────────────────

function GitHubCard() {
  const { isConnected, username, isLoading, connect, disconnect } = useGitHubConnection();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await disconnect();
    setDisconnecting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-border/30 bg-muted/50">
          <Github className="size-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium">GitHub</h4>
          <p className="text-xs text-muted-foreground">
            Connect to clone private repos into your cloud workspace.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking connection...
        </div>
      ) : isConnected ? (
        <div className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="size-2 rounded-full bg-green-500" />
            Connected as <strong>{username}</strong>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-destructive hover:text-destructive"
          >
            {disconnecting ? <Loader2 className="size-3 animate-spin" /> : 'Disconnect'}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => connect()} className="gap-2">
          <Github className="size-4" />
          Connect GitHub
        </Button>
      )}
    </div>
  );
}

// ── Env Vars Card ────────────────────────────────────────────

