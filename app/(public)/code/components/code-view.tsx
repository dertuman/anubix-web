'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cloud, Eye, FileCode2, FolderPlus, Loader2, RefreshCw, Trash2, Upload, WifiOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { useClaudeCodeContext } from '../../workspace/context/claude-code-context';
import { useAutoSuspend } from '@/hooks/useAutoSuspend';
import { useClaudeConnection } from '@/hooks/useClaudeConnection';
import { useCloudMachineContext } from '../../workspace/context/cloud-machine-context';
import type { FileAttachment, CodeMessage, BridgeSession } from '@/types/code';
import { MAX_FILE_SIZE, readFileAsAttachment, formatFileSize } from '@/lib/file-utils';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { CodeInput, type CodeInputHandle, type QueuedMessage } from './code-input';
import { CodeMessageList } from './code-message-list';
import { CodeSidebar, MobileSidebarTrigger } from './code-sidebar';
import { ContextGauge } from './context-gauge';
import { ChangesPanel } from './changes-panel';
import { extractFileChanges } from './changes-utils';

const statusBadgeClass = (status: string) =>
  cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
    status === 'idle' && 'bg-primary/20 text-primary ring-1 ring-primary/25',
    status === 'busy' && 'bg-warning/20 text-warning ring-1 ring-warning/25',
    status === 'error' && 'bg-destructive/20 text-destructive ring-1 ring-destructive/25');

interface CodeViewProps {
  modeToggle?: React.ReactNode;
  onPromptSent?: () => void;
  // Demo preview mode props
  demoPreviewMode?: boolean;
  mockMessages?: CodeMessage[];
  mockSession?: BridgeSession;
}

export function CodeView({ modeToggle, onPromptSent, demoPreviewMode = false, mockMessages, mockSession }: CodeViewProps = {}) {
  const t = useScopedI18n('code');
  const {
    status, disconnect, softDisconnect, sessions, activeSessionId,
    selectSession, createSession, deleteSession, updateSession, refreshSessions,
    pullSession, messages, sendMessage, clearConversation, approve, deny, answerQuestion, abort,
    isBusy, slashCommands, connectionHealth, retry,
    sessionLiveStates, fetchRepos,
    fetchLogs, execCommand, pushCredentials,
  } = useClaudeCodeContext();
  const cloudMachine = useCloudMachineContext();
  const claudeConnection = useClaudeConnection();

  // Derive whether any session is busy (agent actively working)
  const anySessionBusy = useMemo(() => {
    for (const [, state] of sessionLiveStates) {
      if (state.isBusy) return true;
    }
    return false;
  }, [sessionLiveStates]);

  // Coordinated stop: stop first, then disconnect.
  // softDisconnect() AFTER stop completes so auto-reconnect can't race.
  const handleAutoSuspendStop = useCallback(async () => {
    await cloudMachine.stop();
    softDisconnect();
  }, [softDisconnect, cloudMachine]);

  // Manual suspend from sidebar button
  const handleSuspend = useCallback(async () => {
    await cloudMachine.stop();
    softDisconnect();
  }, [softDisconnect, cloudMachine]);

  const autoSuspend = useAutoSuspend({
    bridgeUrl: cloudMachine.machine?.bridgeUrl ?? null,
    bridgeApiKey: cloudMachine.machine?.bridgeApiKey ?? null,
    isActive: cloudMachine.machine?.status === 'running' && connectionHealth === 'connected',
    onStop: handleAutoSuspendStop,
    isBusy: anySessionBusy,
  });

  // Use mock data in preview mode
  const displayMessages = demoPreviewMode && mockMessages ? mockMessages : messages;
  const displaySessions = demoPreviewMode && mockSession ? [mockSession] : sessions;
  const displayActiveSessionId = demoPreviewMode && mockSession ? mockSession.id : activeSessionId;
  const displayActiveSession = demoPreviewMode && mockSession ? mockSession : sessions.find((s) => s.id === activeSessionId);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const dragCounterRef = useRef(0);
  const codeInputRef = useRef<CodeInputHandle>(null);

  const [questionSelectionsMap, setQuestionSelectionsMap] = useState<Map<string, Record<number, string>>>(new Map());
  const handleQuestionSelect = useCallback((messageId: string, selections: Record<number, string>) => {
    setQuestionSelectionsMap((prev) => { const next = new Map(prev); next.set(messageId, selections); return next; });
  }, []);

  // ── Message queue ──────────────────────────────────────────
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const queueIdCounter = useRef(0);

  const handleQueue = useCallback((text: string, files?: FileAttachment[]) => {
    const id = `q-${++queueIdCounter.current}-${Date.now()}`;
    setQueuedMessages((prev) => [...prev, { id, text, files }]);
    setAttachedFiles([]);
  }, []);

  const handleDequeue = useCallback((id: string) => setQueuedMessages((prev) => prev.filter((m) => m.id !== id)), []);

  const handleBypass = useCallback((id: string) => {
    const msg = queuedMessages.find((m) => m.id === id);
    if (!msg) return;
    setQueuedMessages((prev) => prev.filter((m) => m.id !== id));
    abort();
    setTimeout(() => sendMessage(msg.text, msg.files), 100);
  }, [queuedMessages, abort, sendMessage]);

  const prevBusyRef = useRef(isBusy);
  useEffect(() => {
    const wasBusy = prevBusyRef.current;
    prevBusyRef.current = isBusy;
    if (wasBusy && !isBusy && queuedMessages.length > 0) {
      const [first, ...rest] = queuedMessages;
      setQueuedMessages(rest);
      setTimeout(() => sendMessage(first.text, first.files), 200);
    }
  }, [isBusy, queuedMessages, sendMessage]);

  useEffect(() => {
    if (activeSessionId && !demoPreviewMode) setTimeout(() => codeInputRef.current?.focus(), 80);
  }, [activeSessionId, demoPreviewMode]);

  // Handle OAuth errors from GitHub redirect
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error');
    if (error) {
      toast({
        title: 'GitHub connection failed',
        description: error.replace(/_/g, ' '),
        variant: 'destructive'
      });
      // Clean URL
      window.history.replaceState({}, '', '/workspace?mode=code');
    }
  }, []);

  // ── File handling ──────────────────────────────────────────
  const handleFilesAdded = useCallback(async (rawFiles: File[]) => {
    for (const file of rawFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'File too large', description: `"${file.name}" exceeds the ${formatFileSize(MAX_FILE_SIZE)} limit.`, variant: 'destructive' });
        continue;
      }
      try {
        const attachment = await readFileAsAttachment(file);
        setAttachedFiles((prev) => [...prev, attachment]);
      } catch { toast({ title: 'Failed to read file', description: `Could not read "${file.name}".`, variant: 'destructive' }); }
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => setAttachedFiles((prev) => prev.filter((f) => f.id !== id)), []);

  // ── Drag and drop ──────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.types.includes('Files')) setIsDragging(true); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); dragCounterRef.current = 0; setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) { handleFilesAdded(droppedFiles); setTimeout(() => codeInputRef.current?.focus(), 50); }
  }, [handleFilesAdded]);

  // ── Send ───────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string, files?: FileAttachment[]) => {
    // In demo preview mode, notify parent (triggers login prompt) but don't actually send
    if (demoPreviewMode) {
      onPromptSent?.();
      return;
    }
    if (!activeSessionId) return;
    setAttachedFiles([]);
    await sendMessage(text, files);
    // Notify parent about prompt being sent (for demo mode tracking)
    onPromptSent?.();
  }, [activeSessionId, demoPreviewMode, sendMessage, onPromptSent]);

  // ── Cumulative token usage across all result messages ──────
  const tokenUsage = useMemo(() => {
    let input = 0;
    let output = 0;
    for (const m of displayMessages) {
      if (m.type === 'result') {
        input += m.inputTokens ?? 0;
        output += m.outputTokens ?? 0;
      }
    }
    return { input, output, total: input + output };
  }, [displayMessages]);

  // ── File changes for Changes panel ─────────────────────────
  const fileChanges = useMemo(() => extractFileChanges(displayMessages), [displayMessages]);

  // ── Drag overlay ───────────────────────────────────────────
  const dragOverlay = isDragging && (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-muted/50 px-12 py-10">
        <Upload className="size-10 text-primary" />
        <p className="text-sm font-medium text-foreground">Drop files here</p>
        <p className="text-xs text-muted-foreground">Images, code files, audio, and more</p>
      </div>
    </div>
  );

  const handleDisconnect = useCallback(async () => {
    disconnect();
    if (cloudMachine.machine) {
      await cloudMachine.destroy();
    }
  }, [disconnect, cloudMachine]);

  // Note: Removed blocking screens - connection is now handled by CodeViewWrapper
  // and environment dialog. CodeView always renders the full workspace UI.

  // ── Preview URL (for cloud machines) ────────────────────────
  const previewUrl = cloudMachine.machine?.previewUrl ?? undefined;

  // ── No session selected ────────────────────────────────────
  if (!displayActiveSessionId) {
    return (
      <div className="relative flex h-full">
        <CodeSidebar modeToggle={modeToggle} sessions={displaySessions} activeSessionId={displayActiveSessionId} onSelect={selectSession} onCreate={createSession} onDelete={deleteSession} onEdit={updateSession} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} sessionLiveStates={sessionLiveStates} fetchRepos={fetchRepos} newSessionOpen={newSessionOpen} onNewSessionOpenChange={setNewSessionOpen} onPullSession={pullSession} onRefreshSessions={refreshSessions} previewUrl={previewUrl} isBusy={isBusy} onSuspend={cloudMachine.machine?.status === 'running' ? handleSuspend : undefined} onDisconnect={handleDisconnect} claudeConnection={claudeConnection} onFetchLogs={fetchLogs} onExecCommand={execCommand} onPushCredentials={pushCredentials} isPreviewMode={demoPreviewMode} machineStatus={cloudMachine.machine?.status ?? null} connectionHealth={connectionHealth} onResume={() => cloudMachine.start()} />
        <div className="relative flex flex-1 flex-col overflow-hidden" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {dragOverlay}

          {/* Auto-suspend modal dialog (no-session branch) */}
          <Dialog open={autoSuspend.showWarning} onOpenChange={(open) => { if (!open) autoSuspend.keepAlive(); }}>
            <DialogContent hideClose className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Still working?</DialogTitle>
                <DialogDescription>
                  Your environment will suspend in {autoSuspend.countdown}s to save costs.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={autoSuspend.keepAlive}>Keep Working</Button>
                <Button variant="ghost" onClick={autoSuspend.suspendNow}>Suspend Now</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/20 px-2 sm:px-4">
            <div className="flex items-center gap-1.5">
              <MobileSidebarTrigger onClick={() => setSidebarOpen(true)} />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {previewUrl && (
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Open live preview"
                >
                  <Eye className="size-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              )}
              <Link href="/" className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-80">
                <Image src="/logo.webp" alt="Anubix" width={28} height={28} />
              </Link>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 sm:gap-4">
            {cloudMachine.machine?.status === 'stopped' ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 sm:size-16">
                  <Cloud className="size-8 text-amber-500 sm:size-10" />
                </div>
                <p className="text-base font-medium text-foreground sm:text-lg">Environment Suspended</p>
                <p className="text-center text-sm text-muted-foreground">Your environment was suspended to save costs</p>
                <Button
                  onClick={() => cloudMachine.start()}
                  disabled={cloudMachine.isWorking}
                  className="mt-4 gap-2"
                  size="lg"
                >
                  <RefreshCw className={cn('size-4', cloudMachine.isWorking && 'animate-spin')} />
                  Resume Environment
                </Button>
              </>
            ) : cloudMachine.machine?.status === 'starting' ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 sm:size-16">
                  <Loader2 className="size-8 animate-spin text-primary sm:size-10" />
                </div>
                <p className="text-base font-medium text-foreground sm:text-lg">Resuming Environment...</p>
                <p className="text-center text-sm text-muted-foreground">Your environment is starting up</p>
              </>
            ) : status === 'disconnected' || status === 'connecting' ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 sm:size-16">
                  {status === 'connecting' ? (
                    <Loader2 className="size-8 animate-spin text-primary sm:size-10" />
                  ) : (
                    <span className="text-xl font-bold text-primary sm:text-2xl">A</span>
                  )}
                </div>
                <p className="text-base font-medium text-foreground sm:text-lg">
                  {status === 'connecting' ? 'Connecting...' : 'Not Connected'}
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  {status === 'connecting'
                    ? 'Establishing connection to your environment'
                    : 'Connect to an environment to start coding with Claude'}
                </p>
                {status === 'disconnected' && (
                  <Button
                    onClick={() => {
                      const event = new CustomEvent('open-environment-dialog');
                      window.dispatchEvent(event);
                    }}
                    className="mt-4 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                  >
                    <Cloud className="size-5" />
                    Launch Environment
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 sm:size-16">
                  <span className="text-xl font-bold text-primary sm:text-2xl">A</span>
                </div>
                <p className="text-base font-medium text-foreground sm:text-lg">{t('sessions.selectSession')}</p>
                <p className="text-center text-sm text-muted-foreground">Select a session from the sidebar or create a new one</p>
                <Button onClick={() => setNewSessionOpen(true)} className="mt-2 gap-2">
                  <FolderPlus className="size-4" />{t('sessions.newSession')}
                </Button>
              </>
            )}
          </div>
          <div className="shrink-0 border-t border-border/20 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
            <div className="relative mx-auto">
              <Textarea placeholder={t('messages.inputPlaceholder')} className="max-h-[200px] min-h-[48px] resize-none rounded-xl border-border/30 bg-muted/50 py-3 pl-4 pr-20 text-sm focus-visible:ring-1" rows={1} disabled />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active session ─────────────────────────────────────────
  return (
    <div className="relative flex h-full">
      <CodeSidebar modeToggle={modeToggle} sessions={displaySessions} activeSessionId={displayActiveSessionId} onSelect={selectSession} onCreate={createSession} onDelete={deleteSession} onEdit={updateSession} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} sessionLiveStates={sessionLiveStates} fetchRepos={fetchRepos} newSessionOpen={newSessionOpen} onNewSessionOpenChange={setNewSessionOpen} onPullSession={pullSession} onRefreshSessions={refreshSessions} previewUrl={previewUrl} isBusy={isBusy} onSuspend={cloudMachine.machine?.status === 'running' ? handleSuspend : undefined} onDisconnect={handleDisconnect} claudeConnection={claudeConnection} onFetchLogs={fetchLogs} onExecCommand={execCommand} onPushCredentials={pushCredentials} isPreviewMode={demoPreviewMode} machineStatus={cloudMachine.machine?.status ?? null} connectionHealth={connectionHealth} onResume={() => cloudMachine.start()} />
      <div className="relative flex flex-1 flex-col overflow-hidden" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {dragOverlay}

        {/* Auto-suspend modal dialog */}
        <Dialog open={autoSuspend.showWarning} onOpenChange={(open) => { if (!open) autoSuspend.keepAlive(); }}>
          <DialogContent hideClose className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Still working?</DialogTitle>
              <DialogDescription>
                Your environment will suspend in {autoSuspend.countdown}s to save costs.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={autoSuspend.keepAlive}>Keep Working</Button>
              <Button variant="ghost" onClick={autoSuspend.suspendNow}>Suspend Now</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Machine/connection status banners */}
        {cloudMachine.machine?.status === 'stopped' ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <span className="text-amber-700 dark:text-amber-400">Environment suspended</span>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-xs" onClick={() => cloudMachine.start()} disabled={cloudMachine.isWorking}>
              <RefreshCw className={cn('size-3', cloudMachine.isWorking && 'animate-spin')} />
              Resume
            </Button>
          </div>
        ) : cloudMachine.machine?.status === 'starting' ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span className="text-primary">Resuming environment...</span>
          </div>
        ) : connectionHealth === 'failed' && cloudMachine.machine?.status === 'running' ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-destructive">
              <WifiOff className="size-3.5" />
              Connection lost
            </span>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-xs" onClick={retry}>
              <RefreshCw className="size-3" />
              Retry
            </Button>
          </div>
        ) : null}

        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/20 px-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <MobileSidebarTrigger onClick={() => setSidebarOpen(true)} />
            {/* Connection status dot with glow */}
            <span
              className={cn(
                'relative flex size-2 shrink-0 rounded-full',
                connectionHealth === 'connected' && 'bg-emerald-500',
                (connectionHealth === 'connecting' || connectionHealth === 'reconnecting') && 'bg-amber-400 animate-pulse',
                connectionHealth === 'failed' && 'bg-destructive',
                connectionHealth === 'disconnected' && 'bg-muted-foreground/40',
              )}
              title={
                connectionHealth === 'connected' ? 'Connected'
                : connectionHealth === 'connecting' ? 'Connecting…'
                : connectionHealth === 'reconnecting' ? 'Reconnecting…'
                : connectionHealth === 'failed' ? 'Connection lost'
                : 'Disconnected'
              }
            >
              {connectionHealth === 'connected' && (
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 blur-[3px]" />
              )}
              {(connectionHealth === 'connecting' || connectionHealth === 'reconnecting') && (
                <span className="absolute inset-0 rounded-full bg-amber-400 opacity-60 blur-[3px]" />
              )}
            </span>
            <span className="min-w-0 truncate text-sm font-medium">{displayActiveSession?.name}</span>
            {displayActiveSession && connectionHealth === 'connected' && (
              <span className={cn(statusBadgeClass(displayActiveSession.status), 'hidden sm:inline-flex')}>{t(`status.${displayActiveSession.status}`)}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Context usage gauge */}
            <ContextGauge input={tokenUsage.input} output={tokenUsage.output} total={tokenUsage.total} />
            {/* Changes panel trigger */}
            {fileChanges.length > 0 && (
              <button
                onClick={() => setChangesOpen(true)}
                className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="View all file changes"
              >
                <FileCode2 className="size-3.5" />
                <span className="hidden sm:inline">Changes</span>
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-semibold text-primary">
                  {fileChanges.length}
                </span>
              </button>
            )}
            {/* Clear conversation - hide in preview mode */}
            {!demoPreviewMode && (
              <button
                onClick={() => setClearDialogOpen(true)}
                disabled={displayMessages.length === 0}
                className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                title="Clear conversation"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <ConfirmationDialog
              isOpen={clearDialogOpen}
              onOpenChange={setClearDialogOpen}
              title="Clear conversation"
              description="This will clear all messages in the current session. This action cannot be undone."
              confirmButtonText="Clear"
              handleConfirm={() => {
                clearConversation();
                setClearDialogOpen(false);
              }}
            />
            {previewUrl && (
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Open live preview"
              >
                <Eye className="size-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            )}
            <Link href="/" className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-80">
              <Image src="/logo.webp" alt="Anubix" width={28} height={28} />
            </Link>
          </div>
        </div>

        <CodeMessageList messages={displayMessages} isFree={displayActiveSession?.mode === 'cli'} isBusy={isBusy} onApprove={approve} onDeny={deny} onAnswer={answerQuestion} questionSelectionsMap={questionSelectionsMap} onQuestionSelect={handleQuestionSelect} />

        <CodeInput ref={codeInputRef} onSend={handleSend} onStop={abort} isBusy={isBusy} disabled={!displayActiveSessionId && !demoPreviewMode}
          files={attachedFiles} onAddFiles={handleFilesAdded} onRemoveFile={handleRemoveFile} slashCommands={slashCommands}
          activeSessionId={displayActiveSessionId} queuedMessages={queuedMessages} onQueue={handleQueue} onDequeue={handleDequeue} onBypass={handleBypass} isPreviewMode={false} />
      </div>

      {/* Multi-file changes panel */}
      <ChangesPanel open={changesOpen} onOpenChange={setChangesOpen} fileChanges={fileChanges} />
    </div>
  );
}
