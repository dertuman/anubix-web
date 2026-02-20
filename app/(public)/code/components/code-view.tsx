'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FolderPlus, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useScopedI18n } from '@/locales/client';
import { useClaudeCode } from '@/hooks/useClaudeCode';
import { useCloudMachine } from '@/hooks/useCloudMachine';
import type { FileAttachment } from '@/types/code';
import { MAX_FILE_SIZE, readFileAsAttachment, formatFileSize } from '@/lib/file-utils';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { BridgeSetup } from './bridge-setup';
import { CloudProvision } from './cloud-provision';
import { CodeInput, type CodeInputHandle, type QueuedMessage } from './code-input';
import { CodeMessageList } from './code-message-list';
import { CodeSidebar, MobileSidebarTrigger } from './code-sidebar';

const statusBadgeClass = (status: string) =>
  cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
    status === 'idle' && 'bg-primary/20 text-primary ring-1 ring-primary/25',
    status === 'busy' && 'bg-warning/20 text-warning ring-1 ring-warning/25',
    status === 'error' && 'bg-destructive/20 text-destructive ring-1 ring-destructive/25');

export function CodeView() {
  const t = useScopedI18n('code');
  const { isSignedIn } = useAuth();
  const {
    status, connect, connectionError, sessions, activeSessionId,
    selectSession, createSession, deleteSession, updateSession, refreshSessions,
    pullSession, messages, sendMessage, approve, deny, answerQuestion, abort,
    isBusy, slashCommands, connectionHealth,
    sessionLiveStates, fetchRepos,
  } = useClaudeCode();
  const cloudMachine = useCloudMachine();

  const [showManualSetup, setShowManualSetup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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

  // ── Not connected ──────────────────────────────────────────
  if (status === 'disconnected' || status === 'connecting') {
    // Signed-in users get the cloud provisioning flow by default
    if (isSignedIn && !showManualSetup) {
      return (
        <CloudProvision
          onConnected={(url, key) => connect(url, key)}
          onManualSetup={() => setShowManualSetup(true)}
        />
      );
    }
    // Fallback: manual bridge URL + API key entry
    return <BridgeSetup onConnect={connect} isConnecting={status === 'connecting'} error={connectionError} />;
  }

  // Reset manual setup flag when connected
  if (showManualSetup && status === 'connected') setShowManualSetup(false);

  // ── Preview URL (for cloud machines) ────────────────────────
  const previewUrl = cloudMachine.machine?.previewUrl ?? undefined;

  // ── No session selected ────────────────────────────────────
  if (!activeSessionId) {
    return (
      <div className="relative flex h-full">
        <CodeSidebar sessions={sessions} activeSessionId={activeSessionId} onSelect={selectSession} onCreate={createSession} onDelete={deleteSession} onEdit={updateSession} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} sessionLiveStates={sessionLiveStates} fetchRepos={fetchRepos} newSessionOpen={newSessionOpen} onNewSessionOpenChange={setNewSessionOpen} onPullSession={pullSession} onRefreshSessions={refreshSessions} previewUrl={previewUrl} isBusy={isBusy} />
        <div className="relative flex flex-1 flex-col overflow-hidden" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {dragOverlay}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/20 px-2 sm:px-4">
            <div className="flex items-center gap-1.5">
              <MobileSidebarTrigger onClick={() => setSidebarOpen(true)} />
            </div>
            <Link href="/" className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-80">
              <Image src="/logo.webp" alt="Anubix" width={28} height={28} />
            </Link>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 sm:gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 sm:size-16">
              <span className="text-xl font-bold text-primary sm:text-2xl">A</span>
            </div>
            <p className="text-base font-medium text-foreground sm:text-lg">{t('sessions.selectSession')}</p>
            <p className="text-center text-sm text-muted-foreground">Select a session from the sidebar or create a new one</p>
            <Button onClick={() => setNewSessionOpen(true)} className="mt-2 gap-2">
              <FolderPlus className="size-4" />{t('sessions.newSession')}
            </Button>
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
      <CodeSidebar sessions={sessions} activeSessionId={activeSessionId} onSelect={selectSession} onCreate={createSession} onDelete={deleteSession} onEdit={updateSession} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} sessionLiveStates={sessionLiveStates} fetchRepos={fetchRepos} newSessionOpen={newSessionOpen} onNewSessionOpenChange={setNewSessionOpen} onPullSession={pullSession} onRefreshSessions={refreshSessions} previewUrl={previewUrl} isBusy={isBusy} />
      <div className="relative flex flex-1 flex-col overflow-hidden" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {dragOverlay}

        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/20 px-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <MobileSidebarTrigger onClick={() => setSidebarOpen(true)} />
            <span className="min-w-0 truncate text-sm font-medium">{activeSession?.name}</span>
            {activeSession && connectionHealth === 'connected' && (
              <span className={cn(statusBadgeClass(activeSession.status), 'hidden sm:inline-flex')}>{t(`status.${activeSession.status}`)}</span>
            )}
            {connectionHealth === 'reconnecting' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning sm:px-2">
                <span className="size-1.5 animate-pulse rounded-full bg-warning" />
                <span className="hidden sm:inline">Reconnecting...</span>
              </span>
            )}
            {connectionHealth === 'failed' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive sm:px-2">
                <span className="size-1.5 rounded-full bg-destructive" />
                <span className="hidden sm:inline">Connection lost</span>
              </span>
            )}
          </div>
          <Link href="/" className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-80">
            <Image src="/logo.webp" alt="Anubix" width={28} height={28} />
          </Link>
        </div>

        <CodeMessageList messages={messages} isFree={activeSession?.mode === 'cli'} isBusy={isBusy} onApprove={approve} onDeny={deny} onAnswer={answerQuestion} questionSelectionsMap={questionSelectionsMap} onQuestionSelect={handleQuestionSelect} />

        <CodeInput ref={codeInputRef} onSend={handleSend} onStop={abort} isBusy={isBusy} disabled={!activeSessionId}
          files={attachedFiles} onAddFiles={handleFilesAdded} onRemoveFile={handleRemoveFile} slashCommands={slashCommands}
          activeSessionId={activeSessionId} queuedMessages={queuedMessages} onQueue={handleQueue} onDequeue={handleDequeue} onBypass={handleBypass} />
      </div>
    </div>
  );
}
