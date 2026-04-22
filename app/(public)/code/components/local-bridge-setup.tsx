'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Laptop, Loader2, RefreshCw, Trash2 } from 'lucide-react';

import { useBridgeConfig, type GenerateResult } from '@/hooks/useBridgeConfig';
import { Button } from '@/components/ui/button';

interface LocalBridgeSetupProps {
  onConnected: (_bridgeUrl: string, _bridgeApiKey: string) => void;
}

/**
 * One-time setup for connecting a user's own computer as the bridge.
 *
 * Flow:
 *   1. Generate install token + bridge API key (server creates DB row).
 *   2. Show .env contents to copy into the local anubix-bridge checkout.
 *   3. Poll /api/bridge-config; when the bridge self-registers, auto-connect.
 */
export function LocalBridgeSetup({ onConnected }: LocalBridgeSetupProps) {
  const { config, isLoading, refresh, generate, deleteConfig, startPolling, stopPolling } = useBridgeConfig();
  const [generated, setGenerated] = useState<GenerateResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const autoConnectedRef = useRef(false);

  const isOnline = !!config?.bridgeUrl && !!config.lastSeenAt && isRecent(config.lastSeenAt);

  // Poll while waiting for the bridge to come online
  useEffect(() => {
    if (config?.hasInstallToken && !isOnline) {
      startPolling();
      return stopPolling;
    }
    stopPolling();
  }, [config?.hasInstallToken, isOnline, startPolling, stopPolling]);

  // Auto-connect as soon as the bridge reports in
  useEffect(() => {
    if (autoConnectedRef.current) return;
    if (!isOnline || !config?.bridgeUrl || !config.apiKey) return;
    autoConnectedRef.current = true;
    onConnected(config.bridgeUrl, config.apiKey);
  }, [isOnline, config, onConnected]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const result = await generate();
      setGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate credentials');
    } finally {
      setIsGenerating(false);
    }
  }, [generate]);

  const handleReset = useCallback(async () => {
    setError(null);
    setGenerated(null);
    autoConnectedRef.current = false;
    await deleteConfig();
  }, [deleteConfig]);

  const handleCopy = useCallback(async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.envTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  }, [generated]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  // Already online — shown briefly before onConnected fires
  if (isOnline) {
    return (
      <StatusPanel
        icon={<Check className="text-primary size-8" />}
        title="Laptop connected"
        subtitle={config?.bridgeUrl ?? ''}
      />
    );
  }

  // Credentials exist (either just generated, or from a past session) — show .env + waiting state
  if (generated || config?.hasInstallToken) {
    return (
      <WaitingPanel
        envTemplate={generated?.envTemplate ?? null}
        lastSeenAt={config?.lastSeenAt ?? null}
        copied={copied}
        onCopy={handleCopy}
        onReset={handleReset}
        onRefresh={refresh}
      />
    );
  }

  // First-run: nothing exists yet
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="bg-primary/10 mb-3 flex size-16 items-center justify-center rounded-2xl">
          <Laptop className="text-primary size-8" />
        </div>
        <h3 className="text-lg font-semibold">Connect my computer</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Run the Anubix bridge on your own machine. As long as it is on, you can prompt from your phone and edit files at home.
        </p>
      </div>

      <ol className="text-muted-foreground space-y-2 text-sm">
        <li>
          <strong className="text-foreground">1.</strong> Install{' '}
          <a
            href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            cloudflared
          </a>{' '}
          (gives your bridge a public HTTPS URL — no domain or account needed).
        </li>
        <li>
          <strong className="text-foreground">2.</strong> Clone{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">anubix-bridge</code> and run{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">npm install</code>.
        </li>
        <li>
          <strong className="text-foreground">3.</strong> Generate credentials below → paste into <code className="bg-muted rounded px-1 py-0.5 text-xs">.env</code> →{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">npm run dev</code>.
        </li>
      </ol>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 flex items-start gap-2 rounded-lg border p-3 text-sm">
          <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
          <div className="text-destructive">{error}</div>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Generating…
          </>
        ) : (
          'Generate credentials'
        )}
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────

function WaitingPanel({
  envTemplate,
  lastSeenAt,
  copied,
  onCopy,
  onReset,
  onRefresh,
}: {
  envTemplate: string | null;
  lastSeenAt: string | null;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="bg-muted mb-3 flex size-16 items-center justify-center rounded-2xl">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold">Waiting for your bridge…</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          {lastSeenAt
            ? `Last seen ${timeAgo(lastSeenAt)}. Make sure the bridge is still running.`
            : 'Once you start the bridge on your machine, it will connect here automatically.'}
        </p>
      </div>

      {envTemplate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">.env contents</label>
            <Button size="sm" variant="ghost" onClick={onCopy}>
              {copied ? (
                <>
                  <Check className="mr-1 size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 size-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <pre className="bg-muted max-h-56 overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed">
            {envTemplate}
          </pre>
          <p className="text-muted-foreground text-xs">
            Paste this into <code className="bg-muted rounded px-1">.env</code> in your{' '}
            <code className="bg-muted rounded px-1">anubix-bridge</code> checkout, then{' '}
            <code className="bg-muted rounded px-1">npm run dev</code>.
          </p>
        </div>
      )}

      {!envTemplate && (
        <div className="border-border bg-muted/50 rounded-md border p-3 text-sm">
          Credentials already exist for this account but the plaintext was shown previously.
          If you lost them, regenerate to get a fresh copy.
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} className="flex-1">
          <RefreshCw className="mr-1 size-3.5" />
          Check now
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <Trash2 className="mr-1 size-3.5" />
          Start over
        </Button>
      </div>
    </div>
  );
}

function StatusPanel({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="bg-primary/10 flex size-16 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────

/** "Recent" = bridge heartbeated within the last 2 minutes. */
function isRecent(iso: string): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 2 * 60 * 1000;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  if (Number.isNaN(diffMs)) return 'a while ago';
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
