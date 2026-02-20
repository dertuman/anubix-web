'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Github,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';

// ── Types ────────────────────────────────────────────────────

interface EnvVarEntry {
  key: string;
  value: string;
}

// ── Page ─────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Manage connected services and environment variables for your cloud workspaces.
        </p>
      </div>
      <Separator />
      <GitHubCard />
      <Separator />
      <EnvVarsCard />
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

function EnvVarsCard() {
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchVars = useCallback(async () => {
    try {
      const res = await fetch('/api/cloud/env-vars');
      if (!res.ok) return;
      const data = await res.json();
      setEnvVars(data.vars ?? []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVars();
  }, [fetchVars]);

  const handleAdd = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRemove = async (index: number) => {
    const removed = envVars[index];
    setEnvVars((prev) => prev.filter((_, i) => i !== index));

    // If the key was saved in DB, delete it
    if (removed.key.trim()) {
      await fetch('/api/cloud/env-vars', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: removed.key }),
      });
    }
  };

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    setEnvVars((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: val } : v)));
  };

  const handleSave = async () => {
    const valid = envVars.filter((v) => v.key.trim());
    if (valid.length === 0) return;

    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cloud/env-vars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: valid }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      } else {
        setMessage('Saved');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage('Error: Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setMessage(null);
    try {
      const res = await fetch('/api/cloud/env-vars/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Sync error: ${data.error}`);
      } else {
        setMessage(`Synced ${data.count} vars to running machine`);
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage('Sync error: Failed to reach machine');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Environment Variables</h4>
          <p className="text-xs text-muted-foreground">
            These are injected into .env.local when launching a new machine.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleAdd} className="h-7 gap-1 px-2 text-xs">
            <Plus className="size-3" />
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      ) : envVars.length === 0 ? (
        <p className="text-sm text-muted-foreground">No environment variables configured.</p>
      ) : (
        <div className="space-y-2">
          {envVars.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={v.key}
                onChange={(e) => handleChange(i, 'key', e.target.value)}
                placeholder="KEY"
                className="flex-1 font-mono text-xs"
              />
              <Input
                value={v.value}
                onChange={(e) => handleChange(i, 'value', e.target.value)}
                placeholder="value"
                type="password"
                className="flex-1 text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(i)}
                className="h-8 w-8 shrink-0 p-0"
              >
                <Minus className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.startsWith('Error') || message.startsWith('Sync error') ? 'text-destructive' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || envVars.filter((v) => v.key.trim()).length === 0}
          className="gap-1"
        >
          {isSaving ? <Loader2 className="size-3 animate-spin" /> : null}
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={handleSync} className="gap-1">
          <RefreshCw className="size-3" />
          Sync to Machine
        </Button>
      </div>
    </div>
  );
}
