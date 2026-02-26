'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';

import type { BridgeSession } from '@/types/code';
import { parseEnvString, type EnvVarEntry } from '@/lib/env-utils';
import { cn } from '@/lib/utils';
import type { PullResult } from '@/hooks/useClaudeCode';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { useScopedI18n } from '@/locales/client';

export interface SessionEditModalProps {
  session: BridgeSession;
  onClose: () => void;
  onSave: (
    _id: string,
    _updates: { name?: string; repoPaths?: string[] }
  ) => Promise<void>;
  onPullSession?: (_id: string) => Promise<PullResult[] | null>;
  onRefreshSessions?: () => Promise<void>;
  previewUrl?: string;
  isBusy?: boolean;
}

export function SessionEditModal({
  session,
  onClose,
  onSave,
  onPullSession,
  onRefreshSessions,
  previewUrl,
  isBusy,
}: SessionEditModalProps) {
  const t = useScopedI18n('code.sessions');
  const [editName, setEditName] = useState(session.name);
  const [editPaths, setEditPaths] = useState<string[]>(
    session.repoPaths ?? [session.repoPath]
  );
  const [manualPath, setManualPath] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Env vars state ──────────────────────────────────────
  const repoPaths = session.repoPaths ?? [session.repoPath];
  const [activeEnvRepo, setActiveEnvRepo] = useState(repoPaths[0] ?? '__global__');
  const [envVarsByRepo, setEnvVarsByRepo] = useState<Record<string, EnvVarEntry[]>>({});
  const [loadingEnv, setLoadingEnv] = useState(true);
  const [savingEnv, setSavingEnv] = useState(false);
  const [envMessage, setEnvMessage] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState('');

  // Initialize empty env vars for each repo path
  useEffect(() => {
    const result: Record<string, EnvVarEntry[]> = {};
    for (const rp of repoPaths) {
      result[rp] = [];
    }
    setEnvVarsByRepo(result);
    setLoadingEnv(false);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const activeVars = envVarsByRepo[activeEnvRepo] ?? [];

  const setActiveVars = (updater: (_prev: EnvVarEntry[]) => EnvVarEntry[]) => {
    setEnvVarsByRepo((prev) => ({
      ...prev,
      [activeEnvRepo]: updater(prev[activeEnvRepo] ?? []),
    }));
  };

  const mergeEnvVars = (parsed: EnvVarEntry[]) => {
    setActiveVars((prev) => {
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

  const handleEnvPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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

  const handlePushToMachine = async () => {
    const valid = activeVars.filter((v) => v.key.trim());
    if (valid.length === 0) {
      setEnvMessage('Error: No variables to save');
      return;
    }
    setSavingEnv(true);
    setEnvMessage(null);
    try {
      const varsObj: Record<string, string> = {};
      for (const v of valid) {
        varsObj[v.key.trim()] = v.value;
      }

      const res = await fetch('/api/cloud/env-vars/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: varsObj, repo_path: activeEnvRepo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnvMessage(`Error: ${data.error}`);
      } else {
        const displayMsg = data.warning || data.message || `Saved ${data.count} variable(s)`;
        setEnvMessage(displayMsg);
        setTimeout(() => setEnvMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to push env vars:', err);
      setEnvMessage('Error: Failed to save variables');
    } finally {
      setSavingEnv(false);
    }
  };

  const handleDeleteEnvVar = (index: number) => {
    setActiveVars((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Session paths & name ────────────────────────────────
  const addPath = () => {
    const trimmed = manualPath.trim();
    if (trimmed && !editPaths.includes(trimmed)) {
      setEditPaths((p) => [...p, trimmed]);
      setManualPath('');
    }
  };

  const handleSave = async () => {
    if (editPaths.length === 0) return;
    setSaving(true);
    try {
      await onSave(session.id, {
        name: editName.trim() || session.name,
        repoPaths: editPaths,
      });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="border-border bg-background relative z-10 mx-4 w-full max-w-lg rounded-xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="text-muted-foreground absolute top-3 right-3 rounded-md p-1 transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <h2 className="text-lg font-semibold">{t('editSession')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Update the name and repository paths for this session.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-session-name">{t('name')}</Label>
              <Input
                id="edit-session-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('namePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('repoPath')}</Label>
              {editPaths.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {editPaths.map((p) => (
                    <span
                      key={p}
                      className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                    >
                      {p.split(/[\\/]/).pop()}
                      <button
                        onClick={() =>
                          setEditPaths((prev) => prev.filter((x) => x !== p))
                        }
                        className="ml-0.5 rounded-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={manualPath}
                  onChange={(e) => setManualPath(e.target.value)}
                  placeholder={t('orTypePath')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (manualPath.trim()) addPath();
                      else handleSave();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPath}
                  disabled={!manualPath.trim()}
                  className="h-9 shrink-0"
                >
                  {t('add')}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={editPaths.length === 0 || saving}
            >
              {saving ? <Loader variant="glowing" size={16} /> : t('save')}
            </Button>
          </div>

          {/* ── Quick Actions ─────────────────────────────── */}
          {(onPullSession || previewUrl || onRefreshSessions) && (
            <div className="border-border/20 mt-6 border-t pt-5">
              <h3 className="text-sm font-semibold">Quick Actions</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Session management actions.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onPullSession && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const results = await onPullSession(session.id);
                      if (results) {
                        const summary = results
                          .map((r) => {
                            const name = r.path.split(/[\\/]/).pop();
                            return r.error
                              ? `${name}: error`
                              : `${name}: ${r.output || 'up to date'}`;
                          })
                          .join('\n');
                        toast({ title: 'Git Pull', description: summary });
                      } else {
                        toast({
                          title: 'Git Pull',
                          description: 'Failed to pull',
                          variant: 'destructive',
                        });
                      }
                    }}
                    disabled={isBusy}
                    className="gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Git Pull
                  </Button>
                )}
                {previewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewUrl, '_blank')}
                    className="gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    Open Preview
                  </Button>
                )}
                {onRefreshSessions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefreshSessions}
                    className="gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    Refresh Sessions
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Environment Variables ──────────────────────── */}
          <div className="border-border/20 mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold">Environment Variables</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Add variables to your repository. They are stored encrypted and available in all sessions.
            </p>

            {/* Repo tabs (only when multiple repos) */}
            {repoPaths.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {repoPaths.map((rp) => (
                  <button
                    key={rp}
                    onClick={() => {
                      setActiveEnvRepo(rp);
                      setPasteInput('');
                      setEnvMessage(null);
                    }}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      activeEnvRepo === rp
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {rp.split(/[\\/]/).pop()}
                  </button>
                ))}
              </div>
            )}

            {loadingEnv ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {/* Paste area */}
                <Textarea
                  value={pasteInput}
                  onChange={(e) => handleEnvInput(e.target.value)}
                  onPaste={handleEnvPaste}
                  placeholder="Paste .env contents here"
                  rows={2}
                  className="font-mono text-xs"
                />

                {/* Env var rows */}
                {activeVars.length > 0 && (
                  <div className="space-y-2">
                    {activeVars.map((v, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Input
                          value={v.key}
                          onChange={(e) =>
                            setActiveVars((prev) =>
                              prev.map((item, j) =>
                                j === i ? { ...item, key: e.target.value } : item
                              )
                            )
                          }
                          placeholder="KEY"
                          className="min-w-0 flex-1 font-mono text-xs"
                        />
                        <Input
                          value={v.value}
                          onChange={(e) =>
                            setActiveVars((prev) =>
                              prev.map((item, j) =>
                                j === i ? { ...item, value: e.target.value } : item
                              )
                            )
                          }
                          placeholder="value"
                          type="password"
                          className="min-w-0 flex-1 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEnvVar(i)}
                          className="size-9 shrink-0 p-0"
                        >
                          <Minus className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setActiveVars((prev) => [...prev, { key: '', value: '' }])
                  }
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Plus className="size-3" />
                  Add variable
                </Button>

                {envMessage && (
                  <p
                    className={cn(
                      'text-xs',
                      envMessage.startsWith('Error') || envMessage.startsWith('Sync error')
                        ? 'text-destructive'
                        : 'text-green-600'
                    )}
                  >
                    {envMessage}
                  </p>
                )}

                <Button
                  size="sm"
                  onClick={handlePushToMachine}
                  disabled={savingEnv}
                  className="gap-1.5"
                >
                  {savingEnv ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Save className="size-3" />
                  )}
                  {savingEnv ? 'Saving...' : 'Save Variables'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
