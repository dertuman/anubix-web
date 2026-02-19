'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import {
  AlertCircle,
  ChevronDown,
  ClipboardCheck,
  ClipboardCopy,
  Loader2,
  MessageSquarePlus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

import type { ChatConversation, ChatMessage as ChatMessageType } from '@/types/chat';
import { AI_MODELS, AI_MODELS_MAP, DEFAULT_MODEL, PROVIDER_PRECEDENCE, type ModelId } from '@/types/chat';
import type { FileAttachment } from '@/types/code';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useChatStreaming } from '../hooks/use-chat-streaming';
import { useFileAttachments } from '../hooks/use-file-attachments';
import { ApiKeySetup, ApiKeySetupPrompt } from './api-key-setup';
import { ChatInput, type ChatInputHandle } from './chat-input';
import { ChatMessageList } from './chat-message-list';
import { ChatSidebar, MobileSidebarTrigger } from './chat-sidebar';
import { ShareDialog } from './share-dialog';

// ── Query configuration ──────────────────────────────────────
// Prevent unnecessary refetches on tab focus while keeping data fresh
const QUERY_STALE_TIME = 30_000; // 30 seconds

export function ChatView() {
  const t = useScopedI18n('chat');
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  // ── Core state ──────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mdCopied, setMdCopied] = useState(false);
  const chatInputRef = useRef<ChatInputHandle>(null);

  // ── Custom hooks ────────────────────────────────────────────
  const {
    isStreaming,
    streamingContent,
    optimisticMessages,
    waitingForResponse,
    sendMessage,
    abortStream,
  } = useChatStreaming();

  const {
    attachedFiles,
    isDragging,
    addFiles,
    removeFile,
    clearFiles,
    dragHandlers,
  } = useFileAttachments();

  // ── Queries ─────────────────────────────────────────────────

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const res = await axios.get('/api/chat/conversations');
      return res.data.data as ChatConversation[];
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIME,
    retry: 1, // Prevent repeated 500 retries
  });
  const conversations = conversationsData ?? [];

  const { data: messagesData } = useQuery({
    queryKey: ['chat-messages', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await axios.get(`/api/chat/conversations/${selectedId}/messages`);
      return res.data.data as ChatMessageType[];
    },
    enabled: !!selectedId,
    staleTime: QUERY_STALE_TIME,
  });
  const messages = useMemo(() => messagesData ?? [], [messagesData]);

  const {
    data: providersData,
    refetch: refetchProviders,
    isLoading: providersLoading,
    isError: providersError,
  } = useQuery({
    queryKey: ['chat-providers'],
    queryFn: async () => {
      const res = await axios.get('/api/chat/api-keys');
      return res.data.providers as string[];
    },
    enabled: !!userId,
    staleTime: 60_000, // providers rarely change — 1 minute
    retry: 1, // Only retry once — prevent repeated 500s from causing flash loops
  });
  const providers = useMemo(() => providersData ?? [], [providersData]);
  const hasProviders = providers.length > 0;

  // ── Available models (filtered by providers with keys) ──────
  const availableModels = useMemo(
    () =>
      AI_MODELS.filter((m) => (providersData ?? []).includes(m.provider)),
    [providersData],
  );

  // ── Best available model (based on provider precedence) ──────
  const bestAvailableModel = useMemo<ModelId>(() => {
    for (const provider of PROVIDER_PRECEDENCE) {
      if ((providersData ?? []).includes(provider)) {
        const model = AI_MODELS.find((m) => m.provider === provider);
        if (model) return model.id as ModelId;
      }
    }
    return DEFAULT_MODEL;
  }, [providersData]);

  // ── Mutations ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (model: string) => {
      const res = await axios.post('/api/chat/conversations', { model });
      return res.data.data as ChatConversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSelectedId(data.id);
      setTimeout(() => chatInputRef.current?.focus(), 80);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/chat/conversations/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      if (selectedId === id) setSelectedId(null);
    },
  });

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // ── Sync model when conversation changes ────────────────────
  useEffect(() => {
    if (selectedConversation) {
      setSelectedModel(selectedConversation.model as ModelId);
    }
    // Only depend on the conversation id and model, not the full object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, selectedConversation?.model]);

  // ── Auto-select best model when providers change and no conversation active ──
  useEffect(() => {
    if (!selectedConversation) {
      setSelectedModel(bestAvailableModel);
    }
  }, [bestAvailableModel, selectedConversation]);

  // ── Focus input on conversation switch ──────────────────────
  useEffect(() => {
    if (selectedId) setTimeout(() => chatInputRef.current?.focus(), 80);
  }, [selectedId]);

  // ── Model change ────────────────────────────────────────────
  const handleModelChange = useCallback(async (model: ModelId) => {
    setSelectedModel(model);
    if (selectedId) {
      try {
        await axios.patch(`/api/chat/conversations/${selectedId}`, { model });
      } catch { /* non-critical */ }
    }
  }, [selectedId]);

  // ── Copy markdown ───────────────────────────────────────────
  const handleCopyMarkdown = useCallback(async () => {
    const allMsgs = [...messages, ...optimisticMessages];
    const lines: string[] = [];
    for (const msg of allMsgs) {
      if (msg.role === 'user') lines.push(`**You:**\n${msg.content}`);
      else if (msg.role === 'assistant') lines.push(`**Assistant:**\n${msg.content}`);
    }
    await navigator.clipboard.writeText(lines.join('\n\n---\n\n'));
    setMdCopied(true);
    setTimeout(() => setMdCopied(false), 2000);
  }, [messages, optimisticMessages]);

  // ── Clear conversation ──────────────────────────────────────
  const handleClear = useCallback(async () => {
    if (!selectedId) return;
    await deleteMutation.mutateAsync(selectedId);
    const newConv = await createMutation.mutateAsync(selectedModel);
    setSelectedId(newConv.id);
  }, [selectedId, selectedModel, deleteMutation, createMutation]);

  // ── Send message ────────────────────────────────────────────
  const handleSend = useCallback(async (text: string, files?: FileAttachment[]) => {
    let convId = selectedId;

    // Auto-create conversation if none selected
    if (!convId) {
      try {
        const newConv = await createMutation.mutateAsync(selectedModel);
        convId = newConv.id;
        setSelectedId(convId);
      } catch {
        toast({ title: 'Error', description: 'Failed to create conversation.', variant: 'destructive' });
        return;
      }
    }

    clearFiles();
    await sendMessage(convId, text, selectedModel, files);
  }, [selectedId, selectedModel, createMutation, clearFiles, sendMessage]);

  // ── Share toggle ────────────────────────────────────────────
  const handleToggleShare = useCallback(async () => {
    if (!selectedId) return;
    await axios.post(`/api/chat/conversations/${selectedId}/share`);
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  }, [selectedId, queryClient]);

  // ── New chat ────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    createMutation.mutate(selectedModel);
  }, [selectedModel, createMutation]);

  // ── Drag overlay ────────────────────────────────────────────
  const dragOverlay = isDragging && (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-muted/50 px-12 py-10">
        <Upload className="size-10 text-primary" />
        <p className="text-sm font-medium text-foreground">Drop files here</p>
        <p className="text-xs text-muted-foreground">Images, code files, audio, and more</p>
      </div>
    </div>
  );

  // ── Build combined messages (with deduplication) ────────────
  // Server messages take priority; only keep optimistic messages
  // that don't have a server counterpart yet. This prevents
  // duplicates during the bridge → server data handoff.
  const allMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return messages;
    const serverIds = new Set(messages.map((m) => m.id));
    const uniqueOptimistic = optimisticMessages.filter((m) => !serverIds.has(m.id));
    return [...messages, ...uniqueOptimistic];
  }, [messages, optimisticMessages]);
  const totalMessages = allMessages.length;

  // ── Loading state ──────────────────────────────────────────
  // Show a clean loading spinner while we figure out if the user has keys.
  // This prevents the flash between the setup prompt and the chat UI.
  if (conversationsLoading || providersLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  // If providers query errored (e.g. Supabase token issue), show a
  // recoverable error — NOT the "add your keys" prompt, which would be misleading.
  if (providersError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Could not connect to the server. Please try refreshing the page.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchProviders()}>
          Try again
        </Button>
      </div>
    );
  }

  // ── Model selector dropdown ─────────────────────────────────
  const modelSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/30">
          {AI_MODELS_MAP[selectedModel]?.name ?? selectedModel}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
        {availableModels.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => handleModelChange(model.id as ModelId)}
            className={cn('cursor-pointer', selectedModel === model.id && 'bg-primary/10 text-primary')}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{model.name}</span>
              <span className="text-[10px] text-muted-foreground">{model.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Header actions ──────────────────────────────────────────
  const headerActions = (
    <div className="flex items-center gap-1">
      {selectedConversation && (
        <ShareDialog conversation={selectedConversation} onToggleShare={handleToggleShare} />
      )}
      {selectedId && (
        <Button variant="ghost" size="icon" onClick={handleCopyMarkdown} title="Copy as Markdown" className={cn('size-8 text-muted-foreground', mdCopied && 'text-primary')} disabled={totalMessages === 0}>
          {mdCopied ? <ClipboardCheck className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={handleClear} title="Clear conversation" className="size-8 text-muted-foreground hover:text-destructive" disabled={!selectedId || totalMessages === 0 || isStreaming}>
        <Trash2 className="size-3.5" />
      </Button>
      <ApiKeySetup providers={providers} onKeySaved={() => refetchProviders()} />
    </div>
  );

  // ── No conversation selected ────────────────────────────────
  if (!selectedId) {
    return (
      <div className="relative flex h-full">
        <ChatSidebar conversations={conversations} selectedId={selectedId} isLoading={conversationsLoading} onSelect={setSelectedId} onNewChat={handleNewChat} onDelete={(id) => deleteMutation.mutate(id)} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
        <div className="relative flex flex-1 flex-col overflow-hidden" {...dragHandlers}>
          {dragOverlay}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4">
            <div className="flex items-center gap-2">
              <MobileSidebarTrigger onClick={() => setSidebarOpen(true)} />
              {modelSelector}
            </div>
            {headerActions}
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
            {!hasProviders ? (
              <ApiKeySetupPrompt onKeySaved={() => refetchProviders()} />
            ) : (
              <>
                <Image src="/logo.webp" alt="Anubix logo" width={120} height={120} />
                <p className="text-lg font-medium text-foreground">{t('sidebar.selectOrCreate')}</p>
                <p className="text-sm text-muted-foreground">Select a conversation or start a new one</p>
                <Button onClick={handleNewChat} className="mt-2 gap-2">
                  <MessageSquarePlus className="size-4" />{t('sidebar.newChat')}
                </Button>
              </>
            )}
          </div>
          <div className="shrink-0 border-t border-border/20 px-4 pb-4 pt-3">
            <div className="relative mx-auto">
              <Textarea placeholder={t('messages.inputPlaceholder')} className="max-h-[200px] min-h-[48px] resize-none rounded-xl border-border/30 bg-muted/50 py-3 pl-4 pr-20 text-sm focus-visible:ring-1" rows={1} disabled />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active conversation ─────────────────────────────────────
  return (
    <div className="relative flex h-full">
      <ChatSidebar conversations={conversations} selectedId={selectedId} isLoading={conversationsLoading} onSelect={setSelectedId} onNewChat={handleNewChat} onDelete={(id) => deleteMutation.mutate(id)} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="relative flex flex-1 flex-col overflow-hidden" {...dragHandlers}>
        {dragOverlay}

        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/20 px-4">
          <div className="flex items-center gap-2">
            <MobileSidebarTrigger onClick={() => setSidebarOpen(true)} />
            <span className="max-w-[100px] truncate text-sm font-medium sm:max-w-[200px]">{selectedConversation?.title}</span>
            {modelSelector}
          </div>
          {headerActions}
        </div>

        <ChatMessageList
          messages={allMessages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          showThinkingIndicator={waitingForResponse && !isStreaming}
        />

        <ChatInput
          ref={chatInputRef}
          onSend={handleSend}
          onStop={abortStream}
          isStreaming={isStreaming}
          disabled={!selectedId}
          files={attachedFiles}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          hasProviders={hasProviders}
        />
      </div>
    </div>
  );
}
