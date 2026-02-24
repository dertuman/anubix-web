'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cloud, Eye, FolderPlus, Loader2, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { useClaudeCode } from '@/hooks/useClaudeCode';
import { useClaudeConnection } from '@/hooks/useClaudeConnection';
import { useCloudMachine } from '@/hooks/useCloudMachine';
import type { FileAttachment } from '@/types/code';
import { MAX_FILE_SIZE, readFileAsAttachment, formatFileSize } from '@/lib/file-utils';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmationDialog } from '@/components/confirmation-dialog';

import { CodeInput, type CodeInputHandle, type QueuedMessage } from './code-input';
import { CodeMessageList } from './code-message-list';
import { CodeSidebar, MobileSidebarTrigger } from './code-sidebar';
import { ContextGauge } from './context-gauge';

const statusBadgeClass = (status: string) =>
  cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
    status === 'idle' && 'bg-primary/20 text-primary ring-1 ring-primary/25',
    status === 'busy' && 'bg-warning/20 text-warning ring-1 ring-warning/25',
    status === 'error' && 'bg-destructive/20 text-destructive ring-1 ring-destructive/25');

interface CodeViewProps {
  modeToggle?: React.ReactNode;
}

export function CodeView({ modeToggle }: CodeViewProps = {}) {
  const t = useScopedI18n('code');
  const {
    status, disconnect, sessions, activeSessionId,
    selectSession, createSession, deleteSession, updateSession, refreshSessions,
    pullSession, messages, sendMessage, clearConversation, approve, deny, answerQuestion, abort,
    isBusy, slashCommands, connectionHealth,
    sessionLiveStates, fetchRepos,
    fetchLogs, execCommand, pushCredentials,
  } = useClaudeCode();
  const cloudMachine = useCloudMachine();
  const claudeConnection = useClaudeConnection();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
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

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    if (activeSessionId) setTimeout(() => codeInputRef.current?.focus(), 80);
  }, [activeSessionId]);

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
    if (!activeSessionId) return;
    setAttachedFiles([]);
    await sendMessage(text, files);
  }, [activeSessionId, sendMessage]);

  // ── Cumulative token usage across all result messages ──────
  const tokenUsage = useMemo(() => {
    let input = 0;
    let output = 0;
    for (const m of messages) {
      if (m.type === 'result') {
        input += m.inputTokens ?? 0;
        output += m.outputTokens ?? 0;
      }
    }
    return { input, output, total: input + output };
  }, [messages]);

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
  if (!activeSessionId) {
    return (
      <div className="relative flex h-full">
        <CodeSidebar modeToggle={modeToggle} sessions={sessions} activeSessionId={activeSessionId} onSelect={selectSession} onCreate={createSession} onDelete={deleteSession} onEdit={updateSession} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} sessionLiveStates={sessionLiveStates} fetchRepos={fetchRepos} newSessionOpen={newSessionOpen} onNewSessionOpenChange={setNewSessionOpen} onPullSession={pullSession} onRefreshSessions={refreshSessions} previewUrl={previewUrl} isBusy={isBusy} onDisconnect={handleDisconnect} claudeConnection={claudeConnection} onFetchLogs={fetchLogs} onExecCommand={execCommand} onPushCredentials={pushCredentials} />
        <div className="relative flex flex-1 flex-col overflow-hidden" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {dragOverlay}
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
            {status === 'disconnected' || status === 'connecting' ? (
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
                      // Trigger environment dialog through context
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
      <CodeSidebar modeToggle={modeToggle} sessions={sessions} activeSessionId={activeSessionId} onSelect={selectSession} onCreate={createSession} onDelete={deleteSession} onEdit={updateSession} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} sessionLiveStates={sessionLiveStates} fetchRepos={fetchRepos} newSessionOpen={newSessionOpen} onNewSessionOpenChange={setNewSessionOpen} onPullSession={pullSession} onRefreshSessions={refreshSessions} previewUrl={previewUrl} isBusy={isBusy} onDisconnect={handleDisconnect} claudeConnection={claudeConnection} onFetchLogs={fetchLogs} onExecCommand={execCommand} onPushCredentials={pushCredentials} />
      <div className="relative flex flex-1 flex-col overflow-hidden" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {dragOverlay}

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
            <span className="min-w-0 truncate text-sm font-medium">{activeSession?.name}</span>
            {activeSession && connectionHealth === 'connected' && (
              <span className={cn(statusBadgeClass(activeSession.status), 'hidden sm:inline-flex')}>{t(`status.${activeSession.status}`)}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Context usage gauge */}
            <ContextGauge input={tokenUsage.input} output={tokenUsage.output} total={tokenUsage.total} />
            {/* Clear conversation */}
            <button
              onClick={() => setClearDialogOpen(true)}
              disabled={messages.length === 0}
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
              title="Clear conversation"
            >
              <Trash2 className="size-3.5" />
            </button>
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

        <CodeMessageList messages={messages} isFree={activeSession?.mode === 'cli'} isBusy={isBusy} onApprove={approve} onDeny={deny} onAnswer={answerQuestion} questionSelectionsMap={questionSelectionsMap} onQuestionSelect={handleQuestionSelect} />

        <CodeInput ref={codeInputRef} onSend={handleSend} onStop={abort} isBusy={isBusy} disabled={!activeSessionId}
          files={attachedFiles} onAddFiles={handleFilesAdded} onRemoveFile={handleRemoveFile} slashCommands={slashCommands}
          activeSessionId={activeSessionId} queuedMessages={queuedMessages} onQueue={handleQueue} onDequeue={handleDequeue} onBypass={handleBypass} />
      </div>
    </div>
  );
}
