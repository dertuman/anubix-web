'use client';

import { memo, useState } from 'react';
import { useScopedI18n } from '@/locales/client';
import {
  Check,
  ChevronDown,
  ChevronUp,
  EllipsisVertical,
  ExternalLink,
  Eye,
  Github,
  Key,
  Loader2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  RefreshCw,
  ScrollText,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';

import type { BridgeSession } from '@/types/code';
import type { useClaudeConnection } from '@/hooks/useClaudeConnection';
import { cn } from '@/lib/utils';
import type { BridgeLogs, ExecResult, FetchReposResult, PullResult } from '@/hooks/useClaudeCode';
import { toast } from '@/components/ui/use-toast';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import type { PoolSessionState } from '@/hooks/useSessionPool';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmationDialog } from '@/components/confirmation-dialog';

import { SessionEditModal } from './session-edit-modal';
import { SessionNewDialog } from './session-new-dialog';
import { SessionLogsDialog } from './session-logs-dialog';
import { SessionExecDialog } from './session-exec-dialog';
import { SessionCredsDialog } from './session-creds-dialog';

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
  onPullSession?: (_id: string) => Promise<PullResult[] | null>;
  onRefreshSessions?: () => Promise<void>;
  previewUrl?: string;
  isBusy?: boolean;
  onDisconnect?: () => void;
  claudeConnection?: ReturnType<typeof useClaudeConnection>;
  onFetchLogs?: (_opts?: { last?: number; filter?: string }) => Promise<BridgeLogs>;
  onExecCommand?: (_command: string) => Promise<ExecResult>;
  onPushCredentials?: (_opts: { claudeMode: 'cli' | 'sdk'; claudeAuthJson?: string; anthropicApiKey?: string }) => Promise<void>;
  modeToggle?: React.ReactNode;
  isPreviewMode?: boolean;
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
  onPullSession,
  onRefreshSessions,
  previewUrl,
  isBusy,
  onDisconnect,
  claudeConnection,
  onFetchLogs,
  onExecCommand,
  onPushCredentials,
  modeToggle,
  isPreviewMode = false,
}: CodeSidebarProps) {
  const t = useScopedI18n('code.sessions');
  const [collapsed, setCollapsed] = useState(false);

  // Claude re-auth state
  const [showClaudeReauth, setShowClaudeReauth] = useState(false);
  const [reauthStep, setReauthStep] = useState<'idle' | 'waiting_for_code'>('idle');
  const [reauthCode, setReauthCode] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthSaving, setReauthSaving] = useState(false);

  // GitHub connection state
  const [showGitHubDisconnect, setShowGitHubDisconnect] = useState(false);
  const [githubDisconnecting, setGithubDisconnecting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<BridgeSession | null>(null);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);

  // Machine tools state
  const [showMachineTools, setShowMachineTools] = useState(false);
  const [machineTab, setMachineTab] = useState<'logs' | 'terminal' | 'apikey'>('logs');
  const [newOpenInternal, setNewOpenInternal] = useState(false);
  const newOpen = externalNewOpen ?? newOpenInternal;
  const setNewOpen = (open: boolean) => {
    onNewSessionOpenChange
      ? onNewSessionOpenChange(open)
      : setNewOpenInternal(open);
  };

  const github = useGitHubConnection();

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
      <div className="flex flex-col gap-2 p-3">
        {/* Mode toggle - only show in workspace */}
        {modeToggle && <div className="w-full">{modeToggle}</div>}

        <div className="flex items-center gap-1.5">

        <SessionNewDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreate={onCreate}
          fetchRepos={fetchRepos}
          isPreviewMode={isPreviewMode}
        />

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
                  'group flex items-center gap-1 overflow-hidden rounded-lg py-2 pr-1 pl-3 text-sm transition-colors',
                  isPreviewMode ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  activeSessionId === s.id
                    ? 'bg-foreground/6 text-foreground'
                    : isPreviewMode ? 'text-muted-foreground' : 'text-muted-foreground hover:bg-foreground/4 hover:text-foreground'
                )}
                onClick={() => {
                  if (isPreviewMode) return;
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
                  <div className="flex items-center gap-1.5">
                    <span className="block truncate">{s.name}</span>
                    {isPreviewMode && (
                      <Eye className="size-3 shrink-0 text-primary" />
                    )}
                  </div>
                  <span className="text-muted-foreground block truncate text-[10px]">
                    {s.repoPaths && s.repoPaths.length >= 2
                      ? s.repoPaths
                          .map((p) => p.split(/[\\/]/).pop())
                          .join(', ')
                      : s.repoPath}
                  </span>
                </div>
                {!isPreviewMode && (
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
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      {(onDisconnect || claudeConnection) && (
        <div className="border-t border-border/20 p-3 space-y-2">
          {/* GitHub connection status */}
          {github && (
            <div className="space-y-1">
              {github.isLoading ? (
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span className="flex-1">Checking GitHub...</span>
                </div>
              ) : github.isConnected ? (
                <div className="space-y-1">
                  {!showGitHubDisconnect ? (
                    <button
                      onClick={() => setShowGitHubDisconnect(true)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                        'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Github className="size-3.5 shrink-0" />
                      <span className="flex-1 text-left truncate">
                        GitHub: @{github.username}
                      </span>
                      <span className="size-2 shrink-0 rounded-full bg-green-500" />
                    </button>
                  ) : (
                    <div className="space-y-1.5 rounded-lg border border-border/30 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">GitHub Connected</span>
                        <button
                          onClick={() => setShowGitHubDisconnect(false)}
                          className="text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Github className="size-3.5" />
                        <span className="flex-1 truncate">@{github.username}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            setGithubDisconnecting(true);
                            try {
                              await github.disconnect();
                              setShowGitHubDisconnect(false);
                              toast({
                                title: 'GitHub disconnected',
                                description: 'You can reconnect anytime from the sidebar.'
                              });
                            } catch (err) {
                              toast({
                                title: 'Failed to disconnect',
                                description: err instanceof Error ? err.message : 'Please try again',
                                variant: 'destructive'
                              });
                            } finally {
                              setGithubDisconnecting(false);
                            }
                          }}
                          disabled={githubDisconnecting}
                          className="flex-1 gap-1 text-xs text-destructive hover:text-destructive"
                        >
                          {githubDisconnecting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                          Disconnect
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => github.connect('/code')}
                          className="flex-1 gap-1 text-xs"
                        >
                          <RefreshCw className="size-3" />
                          Reconnect
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => github.connect('/code')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                    'text-destructive hover:bg-destructive/10'
                  )}
                >
                  <Github className="size-3.5 shrink-0" />
                  <span className="flex-1 text-left">GitHub not connected</span>
                  <span className="size-2 shrink-0 rounded-full bg-destructive" />
                </button>
              )}
            </div>
          )}

          {/* Claude connection status & re-auth */}
          {claudeConnection && (
            <div className="space-y-2">
              {!showClaudeReauth ? (
                <button
                  onClick={() => setShowClaudeReauth(true)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                    claudeConnection.isConnected
                      ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      : 'text-destructive hover:bg-destructive/10',
                  )}
                >
                  <Key className="size-3.5 shrink-0" />
                  <span className="flex-1 text-left">
                    {claudeConnection.isConnected
                      ? `Claude ${claudeConnection.mode === 'cli' ? 'Pro/Max' : 'API Key'}`
                      : 'Claude not connected'}
                  </span>
                  {claudeConnection.isConnected ? (
                    <span className="size-2 shrink-0 rounded-full bg-green-500" />
                  ) : (
                    <span className="size-2 shrink-0 rounded-full bg-destructive" />
                  )}
                </button>
              ) : (
                <div className="space-y-2 rounded-lg border border-border/30 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Reconnect Claude</span>
                    <button
                      onClick={() => {
                        setShowClaudeReauth(false);
                        setReauthStep('idle');
                        setReauthCode('');
                        setReauthError(null);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>

                  {reauthStep === 'idle' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setReauthError(null);
                        try {
                          const url = await claudeConnection.startOAuth();
                          window.open(url, '_blank', 'noopener');
                          setReauthStep('waiting_for_code');
                        } catch (err) {
                          setReauthError(err instanceof Error ? err.message : 'Failed to start login');
                        }
                      }}
                      className="w-full gap-1.5 text-xs"
                    >
                      <ExternalLink className="size-3" />
                      Login with Claude
                    </Button>
                  )}

                  {reauthStep === 'waiting_for_code' && (
                    <>
                      <p className="text-[10px] text-muted-foreground">
                        Authorize in the tab, then paste the code here.
                      </p>
                      <Input
                        value={reauthCode}
                        onChange={(e) => setReauthCode(e.target.value)}
                        placeholder="Paste code here..."
                        className="h-8 font-mono text-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          setReauthSaving(true);
                          setReauthError(null);
                          try {
                            await claudeConnection.exchangeCode(reauthCode);
                            try {
                              await claudeConnection.pushToMachine();
                            } catch (err) {
                              console.error('Non-fatal: failed to push credentials to machine:', err);
                            }
                            setShowClaudeReauth(false);
                            setReauthStep('idle');
                            setReauthCode('');
                            toast({ title: 'Claude reconnected', description: 'Credentials updated and pushed to machine.' });
                          } catch (err) {
                            setReauthError(err instanceof Error ? err.message : 'Failed');
                            setReauthStep('waiting_for_code');
                          } finally {
                            setReauthSaving(false);
                          }
                        }}
                        disabled={reauthSaving || reauthCode.trim().length === 0}
                        className="w-full gap-1 text-xs"
                      >
                        {reauthSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                        {reauthSaving ? 'Connecting...' : 'Connect & Push'}
                      </Button>
                      <button
                        onClick={() => { setReauthStep('idle'); setReauthCode(''); setReauthError(null); }}
                        className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Start over
                      </button>
                    </>
                  )}

                  {reauthError && (
                    <p className="text-[10px] text-destructive">{reauthError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Machine tools — logs, terminal, API key */}
          {(onFetchLogs || onExecCommand || onPushCredentials) && (
            <div className="space-y-1">
              <button
                onClick={() => setShowMachineTools(!showMachineTools)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Terminal className="size-3.5 shrink-0" />
                <span className="flex-1 text-left">Machine Tools</span>
                {showMachineTools ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>

              {showMachineTools && (
                <div className="space-y-2 rounded-lg border border-border/30 p-2.5">
                  {/* Tab bar */}
                  <div className="flex rounded-lg border border-border/30 p-0.5">
                    {onFetchLogs && (
                      <button
                        onClick={() => setMachineTab('logs')}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium',
                          machineTab === 'logs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <ScrollText className="size-3" /> Logs
                      </button>
                    )}
                    {onExecCommand && (
                      <button
                        onClick={() => setMachineTab('terminal')}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium',
                          machineTab === 'terminal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Terminal className="size-3" /> Terminal
                      </button>
                    )}
                    {onPushCredentials && (
                      <button
                        onClick={() => setMachineTab('apikey')}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium',
                          machineTab === 'apikey' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Key className="size-3" /> API Key
                      </button>
                    )}
                  </div>

                  {machineTab === 'logs' && onFetchLogs && (
                    <SessionLogsDialog onFetchLogs={onFetchLogs} />
                  )}

                  {machineTab === 'terminal' && onExecCommand && (
                    <SessionExecDialog onExecCommand={onExecCommand} />
                  )}

                  {machineTab === 'apikey' && onPushCredentials && (
                    <SessionCredsDialog onPushCredentials={onPushCredentials} />
                  )}
                </div>
              )}
            </div>
          )}

          {onDisconnect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDestroyConfirm(true)}
              className="w-full gap-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-3.5" />
              Disconnect & Destroy Machine
            </Button>
          )}
        </div>
      )}
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
      {onDisconnect && (
        <ConfirmationDialog
          isOpen={showDestroyConfirm}
          onOpenChange={setShowDestroyConfirm}
          title="Destroy Machine"
          description="Are you sure you want to disconnect and destroy your cloud machine? All unsaved work, sessions, and data on the machine will be permanently lost. This cannot be undone."
          confirmButtonText="Destroy Machine"
          handleConfirm={() => {
            setShowDestroyConfirm(false);
            onDisconnect();
          }}
        />
      )}
      {editSession && (
        <SessionEditModal
          session={editSession}
          onClose={() => setEditSession(null)}
          onSave={onEdit}
          onPullSession={onPullSession}
          onRefreshSessions={onRefreshSessions}
          previewUrl={previewUrl}
          isBusy={isBusy}
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
      className="text-muted-foreground size-10 md:hidden"
    >
      <Menu className="size-5" />
    </Button>
  );
}
