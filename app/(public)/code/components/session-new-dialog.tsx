'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderPlus,
  GitBranch,
  Github,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import { getRecentRepoPaths } from '@/lib/stores/bridge-store';
import { cn } from '@/lib/utils';
import type { BridgeRepo, FetchReposResult } from '@/hooks/useClaudeCode';
import { useGitHubRepos, type GitHubRepo } from '@/hooks/useGitHubRepos';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';

export interface SessionNewDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onCreate: (_repoPath: string | string[], _name: string) => Promise<unknown>;
  fetchRepos?: () => Promise<FetchReposResult>;
  isPreviewMode?: boolean;
}

export function SessionNewDialog({
  open,
  onOpenChange,
  onCreate,
  fetchRepos,
  isPreviewMode = false,
}: SessionNewDialogProps) {
  const t = useScopedI18n('code.sessions');
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
  const githubRepos = useGitHubRepos(open && github.isConnected);
  const [ghCloneSearch, setGhCloneSearch] = useState('');

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
    if (!open) return;
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
  }, [open, fetchRepos]);

  const toggleRepoSelection = (repoName: string) =>
    setSelectedPaths((prev) =>
      prev.includes(repoName) ? prev.filter((p) => p !== repoName) : [...prev, repoName]
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
      await github.refresh();
    } catch (err) {
      console.error('Failed to clone repository:', err);
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-border/30 text-foreground hover:bg-accent flex-1 gap-2 bg-transparent"
          disabled={isPreviewMode}
        >
          <FolderPlus className="size-4" />
          {t('newSession')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overflow-x-hidden w-[95vw] sm:max-w-[95vw] md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('newSession')}</DialogTitle>
        </DialogHeader>

        {/* ── Cloning overlay ── */}
        {cloning ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative flex size-14 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <span className="absolute inset-1 animate-pulse rounded-full bg-primary/10" />
              <GitBranch className="relative size-6 text-primary" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium text-foreground">Cloning repository...</p>
              <p className="text-xs text-muted-foreground">Installing dependencies &amp; setting up the project</p>
            </div>
            <div className="flex w-full max-w-[200px] justify-center">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
            </div>
            <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
              You can leave this screen -- cloning continues in the background
            </p>
            {cloneError && (
              <p className="text-sm text-destructive">{cloneError}</p>
            )}
          </div>
        ) : (
        <div className="space-y-4">
          {/* ── Selected paths ── */}
          {selectedPaths.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">
                {t('selected')} ({selectedPaths.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedPaths.map((p) => (
                  <span
                    key={p}
                    className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium max-w-full"
                    title={p}
                  >
                    <span className="truncate">{p.split(/[\\/]/).pop()}</span>
                    <button
                      onClick={() => removeSelectedPath(p)}
                      className="ml-0.5 shrink-0 rounded-sm p-0.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Available repos ── */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium text-foreground">
                {t('availableRepos')}
              </p>
              {basePath && (
                <p className="text-muted-foreground/60 truncate text-[10px]">
                  {basePath}
                </p>
              )}
            </div>
            {loadingRepos && (
              <div className="border-border/20 flex items-center gap-3 rounded-lg border px-4 py-5">
                <Loader variant="glowing" size={20} />
                <span className="text-muted-foreground text-sm">
                  {t('loadingRepos')}
                </span>
              </div>
            )}
            {!loadingRepos && availableRepos.length > 0 && (
              <>
                {availableRepos.length > 5 && (
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder={t('searchRepos')}
                      className="h-9 pl-9 text-sm"
                    />
                  </div>
                )}
                <div className="custom-scrollbar border-border/20 max-h-48 overflow-y-auto rounded-lg border">
                  {filteredRepos.length === 0 ? (
                    <div className="text-muted-foreground px-4 py-4 text-center text-sm">
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
                            'hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                            isSelected && 'bg-primary/10 text-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'flex size-5 shrink-0 items-center justify-center rounded border',
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
                          <span className="font-medium">{r.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
            {!loadingRepos && availableRepos.length === 0 && (
              <div className="border-border/20 rounded-lg border px-4 py-5 text-center">
                <p className="text-muted-foreground text-sm">
                  {t('noReposFound')}
                </p>
                {basePath && (
                  <p className="text-muted-foreground/60 mt-1 text-xs">
                    {t('noReposHint')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Clone from Git ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <GitBranch className="size-3.5" />
                Clone a repository
              </p>
              <div className="flex rounded-md border border-border/30 p-0.5">
                <button
                  onClick={() => setCloneMode('github')}
                  className={cn(
                    'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    cloneMode === 'github'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Github className="size-3" />
                  GitHub
                </button>
                <button
                  onClick={() => setCloneMode('url')}
                  className={cn(
                    'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
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
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      value={ghCloneSearch}
                      onChange={(e) => setGhCloneSearch(e.target.value)}
                      placeholder="Search your GitHub repos..."
                      className="h-9 pl-9 text-sm"
                      disabled={cloning}
                    />
                  </div>
                  {githubRepos.isLoading ? (
                    <div className="flex items-center justify-center py-5">
                      <Loader2 className="text-muted-foreground size-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="custom-scrollbar border-border/20 max-h-40 overflow-y-auto rounded-lg border">
                      {filteredGhCloneRepos.length === 0 ? (
                        <p className="text-muted-foreground p-4 text-center text-sm">
                          No repos found
                        </p>
                      ) : (
                        filteredGhCloneRepos.slice(0, 30).map((repo) => (
                          <button
                            key={repo.full_name}
                            onClick={() => handleCloneGitHubRepo(repo)}
                            disabled={cloning}
                            className="hover:bg-muted/50 flex w-full items-start gap-2 border-b border-border/10 px-3 py-2.5 text-left text-sm last:border-0 disabled:opacity-50"
                            title={repo.full_name}
                          >
                            <span className="min-w-0 flex-1 break-words">{repo.full_name}</span>
                            {repo.private && (
                              <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
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
                  className="border-border/30 text-muted-foreground hover:border-foreground/20 hover:text-foreground flex w-full items-center gap-2.5 rounded-lg border px-4 py-3 text-sm"
                >
                  <Github className="size-4 shrink-0" />
                  <span className="flex-1 text-left">Connect GitHub to browse repos</span>
                </button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={cloneUrl}
                  onChange={(e) => { setCloneUrl(e.target.value); setCloneError(null); }}
                  placeholder="https://github.com/user/repo.git"
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleClone()}
                  disabled={cloning}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClone()}
                  disabled={!cloneUrl.trim() || cloning}
                  className="h-9 shrink-0"
                >
                  {cloning ? <Loader2 className="size-3.5 animate-spin" /> : 'Clone'}
                </Button>
              </div>
            )}

            {cloneError && !cloning && (
              <p className="text-xs text-destructive">{cloneError}</p>
            )}
          </div>

          {/* ── Manual path ── */}
          <div className="space-y-2">
            <Label htmlFor="repo-path" className="text-xs font-medium">{t('repoPath')}</Label>
            <div className="flex items-center gap-2">
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
                className="text-sm"
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
                className="h-9 shrink-0"
              >
                {t('add')}
              </Button>
            </div>
          </div>

          {/* ── Recent repos ── */}
          {recentPaths.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t('recent')}</p>
              <div className="flex flex-wrap gap-1.5">
                {recentPaths.slice(0, 5).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      if (!selectedPaths.includes(p))
                        setSelectedPaths((prev) => [...prev, p]);
                    }}
                    className={cn(
                      'bg-muted/50 hover:bg-muted rounded-md px-2.5 py-1.5 text-xs font-medium max-w-full truncate',
                      selectedPaths.includes(p) &&
                        'bg-primary/10 text-primary'
                    )}
                    title={p}
                  >
                    {p.split(/[\\/]/).pop()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Session name ── */}
          <div className="space-y-2">
            <Label htmlFor="session-name" className="text-xs font-medium">{t('name')}</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => {
                nameManuallyEdited.current = e.target.value.length > 0;
                setName(e.target.value);
              }}
              placeholder={t('namePlaceholder')}
              className="text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* ── Create button ── */}
          <Button
            onClick={handleCreate}
            disabled={selectedPaths.length === 0 || creating}
            className="w-full py-2.5 text-sm font-semibold"
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
        )}
      </DialogContent>
    </Dialog>
  );
}
