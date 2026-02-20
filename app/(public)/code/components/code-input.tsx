'use client';

import {
  forwardRef,
  KeyboardEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ArrowUp,
  Loader2,
  Mic,
  Paperclip,
  Square,
  X,
  Zap,
} from 'lucide-react';
import type { FileAttachment } from '@/types/code';
import type { SlashCommand } from '@/types/code';
import { formatFileSize } from '@/lib/file-utils';
import { getCategoryIcon } from '@/lib/ui-utils';
import { getSessionDraft, setSessionDraft } from '@/lib/stores/bridge-store';
import { cn } from '@/lib/utils';
import { AudioWaveform } from '@/components/ui/audio-waveform';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { SlashCommandMenu, type SlashCommandMenuHandle } from './slash-command-menu';

// ── Types ─────────────────────────────────────────────────────

export interface QueuedMessage {
  id: string;
  text: string;
  files?: FileAttachment[];
}

export interface CodeInputHandle {
  focus: () => void;
  clear: () => void;
  setValue: (_val: string) => void;
}

interface CodeInputProps {
  onSend: (_content: string, _files?: FileAttachment[]) => void;
  onStop: () => void;
  isBusy: boolean;
  disabled: boolean;
  files: FileAttachment[];
  onAddFiles: (_files: File[]) => void;
  onRemoveFile: (_id: string) => void;
  slashCommands: SlashCommand[];
  activeSessionId: string | null;
  queuedMessages: QueuedMessage[];
  onQueue: (_text: string, _files?: FileAttachment[]) => void;
  onDequeue: (_id: string) => void;
  onBypass: (_id: string) => void;
}

// ── Component ─────────────────────────────────────────────────

export const CodeInput = forwardRef<CodeInputHandle, CodeInputProps>(
  (
    {
      onSend, onStop, isBusy, disabled, files, onAddFiles, onRemoveFile,
      slashCommands, activeSessionId,
      queuedMessages, onQueue, onDequeue, onBypass,
    },
    ref,
  ) => {
    const [value, setValueRaw] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const slashMenuRef = useRef<SlashCommandMenuHandle>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevSessionRef = useRef<string | null>(null);
    const valueRef = useRef(value);

    const imageFiles = files.filter((f) => f.category === 'image');
    const nonImageFiles = files.filter((f) => f.category !== 'image');

    // Keep valueRef in sync without triggering effects
    useEffect(() => { valueRef.current = value; }, [value]);

    // ── Input value with draft persistence ──────────────────────

    const setValue = useCallback((val: string) => {
      setValueRaw(val);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => { if (activeSessionId) setSessionDraft(activeSessionId, val); }, 400);
    }, [activeSessionId]);

    const clearInput = useCallback(() => {
      setValueRaw('');
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (activeSessionId) setSessionDraft(activeSessionId, '');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }, [activeSessionId]);

    // ── Draft restoration on session switch ─────────────────────

    useEffect(() => {
      const prev = prevSessionRef.current;
      if (prev && prev !== activeSessionId) {
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
        setSessionDraft(prev, valueRef.current);
      }
      if (activeSessionId && activeSessionId !== prev) setValueRaw(getSessionDraft(activeSessionId));
      else if (!activeSessionId) setValueRaw('');
      prevSessionRef.current = activeSessionId;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSessionId]);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => clearInput(),
      setValue: (val: string) => setValueRaw(val),
    }), [clearInput]);

    // ── Send / queue ────────────────────────────────────────────

    const handleSend = useCallback(() => {
      const trimmed = value.trim();
      if ((!trimmed && files.length === 0) || disabled) return;
      if (isBusy) {
        onQueue(trimmed, files.length > 0 ? [...files] : undefined);
      } else {
        onSend(trimmed, files.length > 0 ? files : undefined);
      }
      clearInput();
    }, [value, files, disabled, isBusy, onSend, onQueue, clearInput]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (slashMenuRef.current?.handleKeyDown(e.key)) { e.preventDefault(); return; }
      if (e.key === 'Escape' && isBusy) { e.preventDefault(); onStop(); return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleInput = () => {
      const el = textareaRef.current;
      if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
    };

    const handleSlashSelect = (cmd: string) => {
      setValue(cmd);
      textareaRef.current?.focus();
    };

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      const pastedFiles: File[] = [];
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        if (e.clipboardData.items[i].kind === 'file') {
          const file = e.clipboardData.items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length === 0) return;
      e.preventDefault();
      onAddFiles(pastedFiles);
    }, [onAddFiles]);

    const handleFilePickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files;
      if (picked && picked.length > 0) onAddFiles(Array.from(picked));
      e.target.value = '';
    }, [onAddFiles]);

    // ── Voice recording ─────────────────────────────────────────

    const startRecording = async () => {
      try {
        audioChunksRef.current = [];
        if (!navigator.mediaDevices?.getUserMedia) {
          toast({ title: 'Not supported', description: 'Your browser does not support audio recording.', variant: 'destructive' });
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
        recorder.start();
        setIsRecording(true);
      } catch (error) {
        const msg = (error as Error).name === 'NotAllowedError'
          ? 'Please allow microphone access in your browser settings.'
          : (error as Error).name === 'NotFoundError'
            ? 'Please connect a microphone and try again.'
            : (error as Error).message || 'Could not start recording.';
        toast({ title: 'Recording error', description: msg, variant: 'destructive' });
      }
    };

    const cancelRecording = () => {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
    };

    const stopAndTranscribe = async (autoSend: boolean) => {
      if (!mediaRecorderRef.current || !isRecording) return;
      setIsRecording(false);
      setIsTranscribing(true);

      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null;

      await new Promise<void>((resolve) => {
        const origOnStop = recorder.onstop;
        recorder.onstop = (e) => {
          if (origOnStop && typeof origOnStop === 'function') origOnStop.call(recorder, e);
          resolve();
        };
        recorder.stop();
      });

      try {
        if (audioChunksRef.current.length === 0) { setIsTranscribing(false); return; }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        if (audioBlob.size === 0) { setIsTranscribing(false); return; }

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Transcription failed');

        const { transcription } = await response.json();
        if (transcription) {
          const existing = value.trim();
          const combined = existing ? `${existing} ${transcription}` : transcription;
          if (autoSend) {
            if (isBusy) onQueue(combined, files.length > 0 ? [...files] : undefined);
            else onSend(combined, files.length > 0 ? files : undefined);
            clearInput();
          } else {
            setValue(combined);
            setTimeout(() => {
              const el = textareaRef.current;
              if (el) { el.focus(); el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
            }, 50);
          }
        }
      } catch (error) {
        toast({ title: 'Transcription failed', description: (error as Error).message || 'Please try again.', variant: 'destructive' });
      } finally {
        setIsTranscribing(false);
      }
    };

    // ── Derived state ───────────────────────────────────────────

    const canSend = value.trim() || files.length > 0;

    // ── File preview ────────────────────────────────────────────

    const filePreview = files.length > 0 && (
      <div className="mb-2 flex flex-wrap gap-2">
        {imageFiles.map((f) => (
          <div key={f.id} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.data} alt={f.name} className="size-16 rounded-lg border border-border/30 object-cover" />
            <button
              type="button"
              onClick={() => onRemoveFile(f.id)}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-all hover:scale-110 hover:brightness-110 group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {nonImageFiles.map((f) => {
          const Icon = getCategoryIcon(f.category);
          return (
            <div key={f.id} className="group relative flex items-center gap-2 rounded-lg border border-border/30 bg-muted/50 px-2.5 py-1.5">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="max-w-[140px] truncate text-xs font-medium">{f.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(f.id)}
                className="ml-1 flex size-4 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    );

    const hiddenFileInput = (
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilePickerChange}
        accept="image/*,audio/*,video/*,application/pdf,.txt,.md,.csv,.json,.xml,.yaml,.yml,.py,.js,.ts,.tsx,.jsx,.go,.rs,.java,.c,.cpp,.cs,.php,.rb,.sql,.sh,.html,.css,.svg,.log,.toml,.ini,.env"
      />
    );

    // ── Queue bar ───────────────────────────────────────────────

    const queueBar = queuedMessages.length > 0 && (
      <div className="mb-2 space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Queued ({queuedMessages.length})
        </p>
        {queuedMessages.map((qm) => (
          <div key={qm.id} className="group flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 py-1.5">
            <p className="min-w-0 flex-1 truncate text-xs text-foreground/80">
              {qm.text}
              {qm.files && qm.files.length > 0 && (
                <span className="ml-1 text-muted-foreground">+{qm.files.length} file{qm.files.length > 1 ? 's' : ''}</span>
              )}
            </p>
            <button
              onClick={() => onBypass(qm.id)}
              title="Send now (aborts current task)"
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-primary opacity-0 transition-all hover:bg-primary/10 group-hover:opacity-100"
            >
              <Zap className="size-3" />
              Send now
            </button>
            <button
              onClick={() => onDequeue(qm.id)}
              title="Remove from queue"
              className="shrink-0 rounded-md p-0.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    );

    // ── Recording UI ────────────────────────────────────────────

    if (isRecording) {
      return (
        <div className="shrink-0 border-t border-border/20 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          {queueBar}
          {filePreview}
          {hiddenFileInput}
          <div className="flex items-center gap-2">
            <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/30 bg-muted/50 px-3 py-2.5">
              <Button variant="ghost" size="icon" onClick={cancelRecording} className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive">
                <X className="size-4" />
              </Button>
              <AudioWaveform stream={streamRef.current} className="h-6 flex-1" />
              <button type="button" onClick={() => stopAndTranscribe(false)} className="shrink-0 cursor-pointer text-xs font-medium text-primary hover:underline">See text</button>
            </div>
            <Button size="icon" onClick={() => stopAndTranscribe(true)} className="animate-recording-pulse size-10 shrink-0 rounded-xl ring-2 ring-primary/30 ring-offset-1 ring-offset-background sm:size-11">
              <ArrowUp className="size-5" />
            </Button>
          </div>
        </div>
      );
    }

    // ── Transcribing UI ─────────────────────────────────────────

    if (isTranscribing) {
      return (
        <div className="shrink-0 border-t border-border/20 px-4 pb-4 pt-3">
          {queueBar}
          <div className="relative mx-auto flex items-center justify-center gap-2 rounded-xl border border-border/30 bg-muted/50 px-3 py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Transcribing...</span>
          </div>
        </div>
      );
    }

    // ── Default UI ──────────────────────────────────────────────

    return (
      <div className="shrink-0 border-t border-border/20 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
        <div className="relative mx-auto">
          {queueBar}
          {filePreview}
          {hiddenFileInput}

          <SlashCommandMenu ref={slashMenuRef} commands={slashCommands} inputValue={value} onSelect={handleSlashSelect} />

          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                onPaste={handlePaste}
                placeholder={isBusy ? 'Type to queue a message...' : 'Message Claude Code...'}
                className="max-h-[200px] min-h-[48px] resize-none rounded-xl border-border/30 bg-muted/50 py-3 pl-11 pr-3 text-base md:text-sm [scrollbar-gutter:stable] focus-visible:ring-1"
                rows={1}
                disabled={disabled}
              />
              <div className="absolute bottom-2 left-2">
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={disabled} className="size-8 rounded-lg text-muted-foreground hover:text-primary">
                  <Paperclip className="size-4" />
                </Button>
              </div>
            </div>

            {/* Action buttons — outside the textarea for proper sizing */}
            <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
              {isBusy && (
                <Button variant="destructive" size="icon" onClick={onStop} className="size-9 rounded-xl sm:size-10" title="Stop (Esc)">
                  <Square className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={startRecording} disabled={disabled} className={cn('rounded-xl text-muted-foreground hover:text-primary', canSend || isBusy ? 'size-9 sm:size-10' : 'size-10 sm:size-11')} title="Record voice">
                <Mic className={cn(canSend || isBusy ? 'size-4 sm:size-[18px]' : 'size-5 sm:size-[22px]')} />
              </Button>
              {canSend && (
                <Button size="icon" onClick={handleSend} disabled={disabled} className="size-10 rounded-xl sm:size-11" title={isBusy ? 'Queue message' : 'Send message'}>
                  <ArrowUp className="size-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

CodeInput.displayName = 'CodeInput';
