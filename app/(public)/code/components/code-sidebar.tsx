'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScopedI18n } from '@/locales/client';
import {
  EllipsisVertical,
  FolderPlus,
  GitBranch,
  Github,
  Loader2,
  Menu,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';

import type { BridgeSession } from '@/types/code';
import { getRecentRepoPaths } from '@/lib/stores/bridge-store';
import { parseEnvString, type EnvVarEntry } from '@/lib/env-utils';
import { cn } from '@/lib/utils';
import type { BridgeRepo, FetchReposResult } from '@/hooks/useClaudeCode';
import { useGitHubRepos, type GitHubRepo } from '@/hooks/useGitHubRepos';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import type { PoolSessionState } from '@/hooks/useSessionPool';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Loader } from '@/components/ui/loader';

// ── Edit session modal ──────────────────────────────────────

function EditSessionModal({
  session,
  onClose,
  onSave,
  t,
}: {
  session: BridgeSession;
  onClose: () => void;
  onSave: (
    _id: string,
    _updates: { name?: string; repoPaths?: string[] }
  ) => Promise<void>;
  t: ReturnType<typeof useScopedI18n<'code.sessions'>>;
}) {
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
  const [syncingEnv, setSyncingEnv] = useState(false);
  const [envMessage, setEnvMessage] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState('');

  // Fetch env vars on mount for each repo path
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      const result: Record<string, EnvVarEntry[]> = {};
      for (const rp of repoPaths) {
        try {
          const res = await fetch(`/api/cloud/env-vars?repo_path=${encodeURIComponent(rp)}`);
          if (res.ok) {
            const data = await res.json();
            result[rp] = (data.vars ?? []).map((v: { key: string; value: string }) => ({
              key: v.key,
              value: v.value,
            }));
          } else {
            result[rp] = [];
          }
        } catch {
          result[rp] = [];
        }
      }
      if (!cancelled) {
        setEnvVarsByRepo(result);
        setLoadingEnv(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const activeVars = envVarsByRepo[activeEnvRepo] ?? [];

  const setActiveVars = (updater: (prev: EnvVarEntry[]) => EnvVarEntry[]) => {
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

  const handleSaveEnv = async () => {
    const valid = activeVars.filter((v) => v.key.trim());
    setSavingEnv(true);
    setEnvMessage(null);
    try {
      const res = await fetch('/api/cloud/env-vars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: valid, repo_path: activeEnvRepo }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEnvMessage(`Error: ${data.error}`);
      } else {
        setEnvMessage('Saved');
        setTimeout(() => setEnvMessage(null), 3000);
      }
    } catch {
      setEnvMessage('Error: Failed to save');
    } finally {
      setSavingEnv(false);
    }
  };

  const handleSyncEnv = async () => {
    setSyncingEnv(true);
    setEnvMessage(null);
    try {
      const res = await fetch('/api/cloud/env-vars/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path: activeEnvRepo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnvMessage(`Sync error: ${data.error}`);
      } else {
        setEnvMessage(`Synced ${data.count} vars to machine`);
        setTimeout(() => setEnvMessage(null), 3000);
      }
    } catch {
      setEnvMessage('Sync error: Failed to reach machine');
    } finally {
      setSyncingEnv(false);
    }
  };

  const handleDeleteEnvVar = async (index: number) => {
    const removed = activeVars[index];
    setActiveVars((prev) => prev.filter((_, i) => i !== index));
    if (removed.key.trim()) {
      fetch('/api/cloud/env-vars', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: removed.key, repo_path: activeEnvRepo }),
      }).catch(() => {});
    }
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
              <div className="flex gap-2">
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
                  className="shrink-0"
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

          {/* ── Environment Variables ──────────────────────── */}
          <div className="border-border/20 mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold">Environment Variables</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Manage .env.local variables per repository.
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
                          className="size-8 shrink-0 p-0"
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

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEnv}
                    disabled={savingEnv}
                    className="gap-1"
                  >
                    {savingEnv ? <Loader2 className="size-3 animate-spin" /> : null}
                    Save Env Vars
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncEnv}
                    disabled={syncingEnv}
                    className="gap-1"
                  >
                    {syncingEnv ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    Sync to Machine
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Sidebar ─────────────────────────────────────────────────

interface CodeSidebarProps {
  sessions: BridgeSession[];
  activeSessionId: string | null;
  onSelect: (_id: string) => void;
  onCreate: (_repoPath: string | string[], _name: string) => Promise<unknown>;
  onDelete: (_id: string) => Promise<void>;
  onEdit: (
    _id: string,
    _updates: { name?: string; repoPaths?: string[]; mode?: 'sdk' | 'cli' }
  ) => Promise<void>;
  mobileOpen: boolean;
  onMobileClose: () => void;
  sessionLiveStates?: Map<string, PoolSessionState>;
  fetchRepos?: () => Promise<FetchReposResult>;
  newSessionOpen?: boolean;
  onNewSessionOpenChange?: (_open: boolean) => void;
}

export const CodeSidebar = memo(function CodeSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onDelete,
  onEdit,
  mobileOpen,
  onMobileClose,
  sessionLiveStates,
  fetchRepos,
  newSessionOpen: externalNewOpen,
  onNewSessionOpenChange,
}: CodeSidebarProps) {
  const t = useScopedI18n('code.sessions');
  const [collapsed, setCollapsed] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<BridgeSession | null>(null);
  const [newOpenInternal, setNewOpenInternal] = useState(false);
  const newOpen = externalNewOpen ?? newOpenInternal;
  const setNewOpen = (open: boolean) => {
    onNewSessionOpenChange
      ? onNewSessionOpenChange(open)
      : setNewOpenInternal(open);
  };
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [manualPath, setManualPath] = useState('');
  const [name, setName] = useState('');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [availableRepos, setAvailableRepos] = useState<BridgeRepo[]>([]);
  const [creating, setCreating] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [basePath, setBasePath] = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cloneMode, setCloneMode] = useState<'github' | 'url'>('github');
  const nameManuallyEdited = useRef(false);

  const github = useGitHubConnection();
  const githubRepos = useGitHubRepos(newOpen && github.isConnected);
  const [ghCloneSearch, setGhCloneSearch] = useState('');

  /** Turn a folder name like "anubix-web" into "Anubix Web" */
  const prettifyRepoName = useCallback(
    (path: string) =>
      (path.split(/[\\/]/).pop() || 'Session')
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    []
  );

  // Auto-fill session name whenever the selected repos change
  useEffect(() => {
    if (nameManuallyEdited.current) return;
    if (selectedPaths.length === 0) {
      setName('');
    } else if (selectedPaths.length === 1) {
      setName(prettifyRepoName(selectedPaths[0]));
    } else {
      setName(selectedPaths.map(prettifyRepoName).join(' + '));
    }
  }, [selectedPaths, prettifyRepoName]);

  const filteredRepos = useMemo(() => {
    if (!repoSearch.trim()) return availableRepos;
    const query = repoSearch.toLowerCase();
    return availableRepos.filter((r) => r.name.toLowerCase().includes(query));
  }, [availableRepos, repoSearch]);

  useEffect(() => {
    if (!newOpen) return;
    nameManuallyEdited.current = false;
    setRecentPaths(getRecentRepoPaths());
    setRepoSearch('');
    if (!fetchRepos) return;
    let cancelled = false;
    setLoadingRepos(true);
    fetchRepos()
      .then((result) => {
        if (!cancelled) {
          setAvailableRepos(result.repos ?? []);
          setBasePath(result.basePath);
          setLoadingRepos(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableRepos([]);
          setBasePath(null);
          setLoadingRepos(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [newOpen, fetchRepos]);

  const toggleRepoSelection = (name: string) =>
    setSelectedPaths((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  const removeSelectedPath = (path: string) =>
    setSelectedPaths((prev) => prev.filter((p) => p !== path));
  const addManualPath = () => {
    const trimmed = manualPath.trim();
    if (trimmed && !selectedPaths.includes(trimmed)) {
      setSelectedPaths((p) => [...p, trimmed]);
      setManualPath('');
    }
  };

  const handleClone = async (urlOverride?: string) => {
    const url = (urlOverride ?? cloneUrl).trim();
    if (!url) return;
    setCloning(true);
    setCloneError(null);
    try {
      const res = await fetch('/api/cloud/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCloneError(data.error || 'Clone failed');
        return;
      }
      // Add the cloned repo to available repos and select it
      const repoName = data.name as string;
      const repoPath = data.path as string;
      if (!availableRepos.some((r) => r.name === repoName)) {
        setAvailableRepos((prev) => [...prev, { name: repoName, path: repoPath }]);
      }
      if (!selectedPaths.includes(repoName)) {
        setSelectedPaths((prev) => [...prev, repoName]);
      }
      setCloneUrl('');
      setGhCloneSearch('');
    } catch {
      setCloneError('Failed to clone repository');
    } finally {
      setCloning(false);
    }
  };

  const handleCloneGitHubRepo = (repo: GitHubRepo) => {
    handleClone(repo.clone_url);
  };

  const filteredGhCloneRepos = useMemo(() => {
    if (!github.isConnected) return [];
    const repos = githubRepos.repos;
    if (!ghCloneSearch.trim()) return repos;
    const q = ghCloneSearch.toLowerCase();
    return repos.filter((r) => r.full_name.toLowerCase().includes(q));
  }, [github.isConnected, githubRepos.repos, ghCloneSearch]);

  const handleCreate = async () => {
    if (selectedPaths.length === 0) return;
    setCreating(true);
    const repoArg =
      selectedPaths.length === 1 ? selectedPaths[0] : selectedPaths;
    const autoName =
      name.trim() ||
      (selectedPaths.length === 1
        ? prettifyRepoName(selectedPaths[0])
        : selectedPaths.map(prettifyRepoName).join(' + '));
    await onCreate(repoArg, autoName);
    setCreating(false);
    setSelectedPaths([]);
    setManualPath('');
    setName('');
    nameManuallyEdited.current = false;
    setNewOpen(false);
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    setDeleteId(null);
  };

  const statusColor = (session: BridgeSession) => {
    const live = sessionLiveStates?.get(session.id);
    if (live) {
      if (
        live.connectionHealth === 'reconnecting' ||
        live.connectionHealth === 'connecting'
      )
        return 'bg-warning animate-pulse';
      if (live.connectionHealth === 'failed') return 'bg-destructive';
      if (live.isBusy) return 'bg-warning';
      return 'bg-primary';
    }
    switch (session.status) {
      case 'idle':
        return 'bg-primary';
      case 'busy':
        return 'bg-warning';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-1.5 p-3">
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-border/30 text-foreground hover:bg-accent flex-1 gap-2 bg-transparent"
            >
              <FolderPlus className="size-4" />
              {t('newSession')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('newSession')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedPaths.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    {t('selected')} ({selectedPaths.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPaths.map((p) => (
                      <span
                        key={p}
                        className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                      >
                        {p.split(/[\\/]/).pop()}
                        <button
                          onClick={() => removeSelectedPath(p)}
                          className="ml-0.5 rounded-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {basePath && (
                  <p className="text-muted-foreground/60 truncate text-[10px]">
                    {t('scanning')}: {basePath}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  {t('availableRepos')}
                </p>
                {loadingRepos && (
                  <div className="border-border/20 flex items-center gap-3 rounded-md border px-3 py-4">
                    <Loader variant="glowing" size={20} />
                    <span className="text-muted-foreground text-xs">
                      {t('loadingRepos')}
                    </span>
                  </div>
                )}
                {!loadingRepos && availableRepos.length > 0 && (
                  <>
                    {availableRepos.length > 5 && (
                      <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                        <Input
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                          placeholder={t('searchRepos')}
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                    )}
                    <div className="custom-scrollbar border-border/20 max-h-52 overflow-y-auto rounded-md border">
                      {filteredRepos.length === 0 ? (
                        <div className="text-muted-foreground px-3 py-3 text-center text-xs">
                          {t('noMatchingRepos')}
                        </div>
                      ) : (
                        filteredRepos.map((r) => {
                          const isSelected = selectedPaths.includes(r.name);
                          return (
                            <button
                              key={r.path}
                              onClick={() => toggleRepoSelection(r.name)}
                              className={cn(
                                'hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                                isSelected && 'bg-primary/10 text-foreground'
                              )}
                            >
                              <div
                                className={cn(
                                  'flex size-4 shrink-0 items-center justify-center rounded border',
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/30'
                                )}
                              >
                                {isSelected && (
                                  <svg
                                    className="size-3"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <path
                                      d="M2 6l3 3 5-5"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              {r.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
                {!loadingRepos && availableRepos.length === 0 && (
                  <div className="border-border/20 rounded-md border px-3 py-4 text-center">
                    <p className="text-muted-foreground text-xs">
                      {t('noReposFound')}
                    </p>
                    {basePath && (
                      <p className="text-muted-foreground/60 mt-1 text-[10px]">
                        {t('noReposHint')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Clone from Git */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <GitBranch className="size-3" />
                    Clone a repository
                  </p>
                  <div className="flex rounded-md border border-border/30 p-0.5">
                    <button
                      onClick={() => setCloneMode('github')}
                      className={cn(
                        'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                        cloneMode === 'github'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Github className="size-2.5" />
                      GitHub
                    </button>
                    <button
                      onClick={() => setCloneMode('url')}
                      className={cn(
                        'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                        cloneMode === 'url'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {cloneMode === 'github' ? (
                  github.isConnected ? (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                        <Input
                          value={ghCloneSearch}
                          onChange={(e) => setGhCloneSearch(e.target.value)}
                          placeholder="Search your GitHub repos..."
                          className="h-8 pl-8 text-xs"
                          disabled={cloning}
                        />
                      </div>
                      {githubRepos.isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="text-muted-foreground size-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="custom-scrollbar border-border/20 max-h-36 overflow-y-auto rounded-md border">
                          {filteredGhCloneRepos.length === 0 ? (
                            <p className="text-muted-foreground p-3 text-center text-xs">
                              No repos found
                            </p>
                          ) : (
                            filteredGhCloneRepos.slice(0, 30).map((repo) => (
                              <button
                                key={repo.full_name}
                                onClick={() => handleCloneGitHubRepo(repo)}
                                disabled={cloning}
                                className="hover:bg-muted/50 flex w-full items-center gap-2 border-b border-border/10 px-3 py-1.5 text-left text-xs last:border-0 disabled:opacity-50"
                              >
                                <span className="min-w-0 flex-1 truncate">{repo.full_name}</span>
                                {repo.private && (
                                  <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[9px]">
                                    private
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => github.connect('/code')}
                      className="border-border/30 text-muted-foreground hover:border-foreground/20 hover:text-foreground flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-xs"
                    >
                      <Github className="size-3.5 shrink-0" />
                      <span className="flex-1 text-left">Connect GitHub to browse repos</span>
                    </button>
                  )
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={cloneUrl}
                      onChange={(e) => { setCloneUrl(e.target.value); setCloneError(null); }}
                      placeholder="https://github.com/user/repo.git"
                      className="text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleClone()}
                      disabled={cloning}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone()}
                      disabled={!cloneUrl.trim() || cloning}
                      className="shrink-0"
                    >
                      {cloning ? <Loader2 className="size-3 animate-spin" /> : 'Clone'}
                    </Button>
                  </div>
                )}

                {cloneError && (
                  <p className="text-xs text-destructive">{cloneError}</p>
                )}
                {cloning && (
                  <p className="text-muted-foreground text-[10px]">
                    Cloning and installing dependencies...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="repo-path">{t('repoPath')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="repo-path"
                    autoFocus={availableRepos.length === 0 && !loadingRepos}
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    placeholder={
                      availableRepos.length > 0
                        ? t('orTypePath')
                        : t('repoPathPlaceholder')
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (manualPath.trim()) addManualPath();
                        else handleCreate();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addManualPath}
                    disabled={!manualPath.trim()}
                    className="shrink-0"
                  >
                    {t('add')}
                  </Button>
                </div>
              </div>

              {recentPaths.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">{t('recent')}</p>
                  <div className="flex flex-wrap gap-1">
                    {recentPaths.slice(0, 5).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          if (!selectedPaths.includes(p))
                            setSelectedPaths((prev) => [...prev, p]);
                        }}
                        className={cn(
                          'bg-muted/50 hover:bg-muted rounded-md px-2 py-1 text-xs',
                          selectedPaths.includes(p) &&
                            'bg-primary/10 text-primary'
                        )}
                      >
                        {p.split(/[\\/]/).pop()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="session-name">{t('name')}</Label>
                <Input
                  id="session-name"
                  value={name}
                  onChange={(e) => {
                    nameManuallyEdited.current = e.target.value.length > 0;
                    setName(e.target.value);
                  }}
                  placeholder={t('namePlaceholder')}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={selectedPaths.length === 0 || creating}
                className="w-full"
              >
                {creating ? (
                  <Loader variant="glowing" size={20} />
                ) : selectedPaths.length >= 2 ? (
                  `Create Workspace (${selectedPaths.length} folders)`
                ) : (
                  t('create')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground hidden size-8 shrink-0 md:flex"
        >
          <PanelLeftClose className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          className="text-muted-foreground hover:text-foreground size-8 shrink-0 md:hidden"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 [&>[data-radix-scroll-area-viewport]>div]:block!">
        <div className="space-y-0.5 px-2 pb-2">
          {sessions.length === 0 ? (
            <div className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t('noSessions')}
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'group flex cursor-pointer items-center gap-1 overflow-hidden rounded-lg py-2 pr-1 pl-3 text-sm transition-colors',
                  activeSessionId === s.id
                    ? 'bg-foreground/6 text-foreground'
                    : 'text-muted-foreground hover:bg-foreground/4 hover:text-foreground'
                )}
                onClick={() => {
                  onSelect(s.id);
                  onMobileClose();
                }}
              >
                <span
                  className={cn(
                    'mr-1.5 size-2 shrink-0 rounded-full',
                    statusColor(s)
                  )}
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{s.name}</span>
                  <span className="text-muted-foreground block truncate text-[10px]">
                    {s.repoPaths && s.repoPaths.length >= 2
                      ? s.repoPaths
                          .map((p) => p.split(/[\\/]/).pop())
                          .join(', ')
                      : s.repoPath}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground size-7 shrink-0 md:opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditSession(s);
                      }}
                    >
                      <Pencil className="mr-2 size-3.5" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(s.id);
                      }}
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );

  const dialogs = (
    <>
      <ConfirmationDialog
        isOpen={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={t('delete')}
        description="Are you sure you want to delete this session? This cannot be undone."
        confirmButtonText={t('delete')}
        handleConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />
      {editSession && (
        <EditSessionModal
          session={editSession}
          onClose={() => setEditSession(null)}
          onSave={onEdit}
          t={t}
        />
      )}
    </>
  );

  if (collapsed) {
    return (
      <>
        <div className="border-border/20 bg-muted/20 hidden h-full w-12 flex-col items-center border-r pt-3 md:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="text-muted-foreground hover:text-foreground size-8"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <div className="border-border/20 bg-muted/20 hidden h-full w-72 flex-col border-r md:flex">
        {sidebarContent}
      </div>
      {mobileOpen && (
        <>
          <div
            className="bg-background/80 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
          />
          <div className="border-border/20 bg-background fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r md:hidden">
            {sidebarContent}
          </div>
        </>
      )}
      {dialogs}
    </>
  );
});

export function MobileSidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="text-muted-foreground size-8 md:hidden"
    >
      <Menu className="size-4" />
    </Button>
  );
}
