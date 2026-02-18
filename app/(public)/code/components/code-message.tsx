'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Check, CheckCircle, ChevronDown, ChevronRight,
  Copy, FileAudio, FileCode, FileIcon, FileText, FileVideo,
  Loader2, MessageSquareText, Mic, ShieldAlert, Terminal, X, XCircle, Zap,
} from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import type {
  CodeMessage as CodeMessageType,
  CodeToolUseMessage,
  AskQuestionItem,
  FileAttachment,
} from '@/types/code';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/file-utils';
import { AudioWaveform } from '@/components/ui/audio-waveform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Helpers ──────────────────────────────────────────────────

function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground/80" title="Actions">
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer gap-2">
          <Copy className="size-3.5" />
          <span>{copied ? 'Copied!' : 'Copy text'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|^---$/gm;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] && match[2]) {
      parts.push(<a key={keyIndex++} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-info underline underline-offset-2 hover:text-info/80">{match[1]}</a>);
    } else if (match[3]) {
      parts.push(<strong key={keyIndex++}>{match[3]}</strong>);
    } else if (match[0] === '---') {
      parts.push(<hr key={keyIndex++} className="my-2 border-border/30" />);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'audio': return FileAudio;
    case 'video': return FileVideo;
    case 'text': return FileCode;
    case 'pdf': return FileText;
    default: return FileIcon;
  }
}

function ElapsedTimer({ startTs, stopped }: { startTs: number; stopped?: boolean }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startTs) / 1000));
  const frozenRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (stopped && frozenRef.current === null) {
      frozenRef.current = Math.floor((Date.now() - startTs) / 1000);
      setElapsed(frozenRef.current);
    }
  }, [stopped, startTs]);

  useEffect(() => {
    if (stopped) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTs) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTs, stopped]);

  const displayElapsed = frozenRef.current ?? elapsed;
  if (displayElapsed > 3600) return null;

  const mins = Math.floor(displayElapsed / 60);
  const secs = displayElapsed % 60;
  return <span className="tabular-nums text-xs text-muted-foreground">{mins > 0 ? `${mins}m ` : ''}{secs}s</span>;
}

function CollapsibleText({ text, maxLines = 20 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  const needsCollapse = lines.length > maxLines;
  const displayText = needsCollapse && !expanded ? lines.slice(0, maxLines).join('\n') + '\n...' : trimmed;

  return (
    <div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{renderMarkdown(displayText)}</div>
      {needsCollapse && (
        <button onClick={() => setExpanded(!expanded)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline">
          <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.getDate() !== now.getDate() || date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }
  return time;
}

// ── Main component ──────────────────────────────────────────

interface CodeMessageProps {
  message: CodeMessageType;
  isFree?: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
  onAnswer?: (_answers: Record<string, string>) => void;
  questionSelections?: Record<number, string>;
  onQuestionSelect?: (_messageId: string, _selections: Record<number, string>) => void;
}

export function CodeMessage({ message, isFree, onApprove, onDeny, onAnswer, questionSelections, onQuestionSelect }: CodeMessageProps) {
  const t = useScopedI18n('code.messages');

  const content = useMemo(() => {
    switch (message.type) {
      case 'user': return <UserMessage text={message.text} images={message.images} files={message.files} />;
      case 'assistant_text': return <AssistantTextMessage text={message.text} isComplete={message.isComplete} />;
      case 'tool_use': return <ToolUseMessage toolName={message.toolName} isComplete={message.isComplete} ts={message.ts} t={t} />;
      case 'approval_request': return <ApprovalRequestMessage toolName={message.toolName} toolInput={message.toolInput} onApprove={() => onApprove?.()} onDeny={() => onDeny?.()} t={t} />;
      case 'question': return <QuestionMessage questions={message.questions} onAnswer={(a) => onAnswer?.(a)} initialSelections={questionSelections} onPartialSelect={(s) => onQuestionSelect?.(message.id, s)} />;
      case 'result': return <ResultMessage message={message} isFree={isFree} t={t} />;
      case 'error': return <ErrorMessage error={message.error} subtype={message.subtype} />;
      case 'system': return <SystemMessage text={message.text} />;
      default: return null;
    }
  }, [message, isFree, onApprove, onDeny, onAnswer, questionSelections, onQuestionSelect, t]);

  const showTimestamp = message.type !== 'tool_use' && message.type !== 'system';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      {showTimestamp && (
        <p className={cn('mb-0.5 text-[10px] text-muted-foreground/50', message.type === 'user' ? 'text-right' : 'text-left')}>
          {formatTimestamp(message.ts)}
        </p>
      )}
      {content}
    </motion.div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function UserMessage({ text, images, files }: { text: string; images?: string[]; files?: FileAttachment[] }) {
  const nonImageFiles = useMemo(() => (files ?? []).filter((f) => f.category !== 'image'), [files]);

  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] flex-col gap-2">
        {nonImageFiles.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {nonImageFiles.map((f) => {
              const Icon = getCategoryIcon(f.category);
              return (
                <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/50 px-2.5 py-1.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="max-w-[160px] truncate text-xs font-medium">{f.name}</span>
                    {f.size > 0 && <span className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {text && (
          <div className="flex items-start gap-1.5 self-end overflow-hidden rounded-xl bg-accent px-4 py-2.5 text-accent-foreground">
            <p className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
            <MessageActions text={text} />
          </div>
        )}
        {images && images.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {images.map((img, i) => <img key={i} src={img} alt="" className="max-h-48 max-w-[300px] rounded-xl object-cover" />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantTextMessage({ text, isComplete }: { text: string; isComplete: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-1.5 overflow-hidden rounded-xl bg-muted px-4 py-2.5">
        <div className="min-w-0 flex-1 wrap-break-word">
          <CollapsibleText text={text} />
          {!isComplete && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground/60" />}
        </div>
        <MessageActions text={text} />
      </div>
    </div>
  );
}

function ToolUseMessage({ toolName, isComplete, ts, t }: { toolName: string; isComplete: boolean; ts: number; t: ReturnType<typeof useScopedI18n<'code.messages'>> }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2">
        <Terminal className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground/80">{toolName}</span>
        {isComplete ? (
          <>
            <Badge variant="outline" className="h-5 gap-0.5 border-custom-green/40 bg-custom-green/10 px-1.5 text-[10px] text-custom-green">
              <Check className="size-2.5" />{t('toolComplete')}
            </Badge>
            <ElapsedTimer startTs={ts} stopped />
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary/60" />
              <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-primary/60" />
              <span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-primary/60" />
            </div>
            <ElapsedTimer startTs={ts} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Tool-use groups ─────────────────────────────────────────

export interface ToolUseGroupData {
  id: string;
  toolName: string;
  messages: CodeToolUseMessage[];
  allComplete: boolean;
  firstTs: number;
  activeMessage: CodeToolUseMessage | null;
}

export function ToolUseGroup({ group, t }: { group: ToolUseGroupData; t: ReturnType<typeof useScopedI18n<'code.messages'>> }) {
  const [expanded, setExpanded] = useState(false);
  const { toolName, messages, allComplete, firstTs, activeMessage } = group;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      <div className="flex justify-start">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 transition-colors hover:bg-muted/80">
          <ChevronRight className={cn('size-3 text-muted-foreground transition-transform duration-200', expanded && 'rotate-90')} />
          <Terminal className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground/80">{toolName}</span>
          <span className="text-xs text-muted-foreground">{t('toolGroupCount', { count: messages.length })}</span>
          {allComplete ? (
            <><Badge variant="outline" className="h-5 gap-0.5 border-custom-green/40 bg-custom-green/10 px-1.5 text-[10px] text-custom-green"><Check className="size-2.5" />{t('toolComplete')}</Badge><ElapsedTimer startTs={firstTs} stopped /></>
          ) : (
            <><div className="flex items-center gap-1"><span className="size-1.5 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary/60" /><span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-primary/60" /><span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-primary/60" /></div><ElapsedTimer startTs={firstTs} /></>
          )}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="ml-4 mt-1 space-y-1 overflow-hidden border-l-2 border-border/20 pl-3">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.1 }}>
                <ToolUseMessage toolName={msg.toolName} isComplete={msg.isComplete} ts={msg.ts} t={t} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!expanded && activeMessage && (
        <div className="ml-4 mt-1 border-l-2 border-primary/30 pl-3">
          <ToolUseMessage toolName={activeMessage.toolName} isComplete={activeMessage.isComplete} ts={activeMessage.ts} t={t} />
        </div>
      )}
    </motion.div>
  );
}

export interface ToolUseSuperGroupData {
  id: string;
  messages: CodeToolUseMessage[];
  allComplete: boolean;
  firstTs: number;
  activeMessage: CodeToolUseMessage | null;
  toolBreakdown: Record<string, number>;
}

export function ToolUseSuperGroup({ group, t }: { group: ToolUseSuperGroupData; t: ReturnType<typeof useScopedI18n<'code.messages'>> }) {
  const [expanded, setExpanded] = useState(false);
  const { messages, allComplete, firstTs, activeMessage, toolBreakdown } = group;

  const breakdownStr = Object.entries(toolBreakdown).sort(([, a], [, b]) => b - a).map(([name, n]) => `${name} x${n}`).join(' · ');

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      <div className="flex justify-start">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 transition-colors hover:bg-muted/80">
          <ChevronRight className={cn('size-3 text-muted-foreground transition-transform duration-200', expanded && 'rotate-90')} />
          <Zap className="size-3.5 text-primary/70" />
          <span className="text-xs font-medium text-foreground/80">{t('toolSuperGroupLabel')}</span>
          <span className="text-xs text-muted-foreground">{t('toolSuperGroupCount', { count: messages.length })}</span>
          {allComplete ? (
            <><Badge variant="outline" className="h-5 gap-0.5 border-custom-green/40 bg-custom-green/10 px-1.5 text-[10px] text-custom-green"><Check className="size-2.5" />{t('toolComplete')}</Badge><ElapsedTimer startTs={firstTs} stopped /></>
          ) : (
            <><div className="flex items-center gap-1"><span className="size-1.5 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary/60" /><span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-primary/60" /><span className="size-1.5 animate-[pulse_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-primary/60" /></div><ElapsedTimer startTs={firstTs} /></>
          )}
        </button>
      </div>
      <div className="ml-9 mt-0.5"><span className="text-[10px] text-muted-foreground/70">{breakdownStr}</span></div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="ml-4 mt-1 space-y-1 overflow-hidden border-l-2 border-border/20 pl-3">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.1 }}>
                <ToolUseMessage toolName={msg.toolName} isComplete={msg.isComplete} ts={msg.ts} t={t} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!expanded && activeMessage && (
        <div className="ml-4 mt-1 border-l-2 border-primary/30 pl-3">
          <ToolUseMessage toolName={activeMessage.toolName} isComplete={activeMessage.isComplete} ts={activeMessage.ts} t={t} />
        </div>
      )}
    </motion.div>
  );
}

// ── Approval / Question / Result / Error / System ────────────

function ApprovalRequestMessage({ toolName, toolInput, onApprove, onDeny, t }: { toolName: string; toolInput?: Record<string, unknown>; onApprove: () => void; onDeny: () => void; t: ReturnType<typeof useScopedI18n<'code.messages'>> }) {
  const [decided, setDecided] = useState(false);
  const inputStr = toolInput ? JSON.stringify(toolInput, null, 2) : null;

  return (
    <div className="flex justify-start">
      <div className="w-full space-y-2.5 rounded-xl border border-caution/20 bg-caution/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-caution" />
          <span className="text-sm font-medium">{toolName}</span>
        </div>
        {inputStr && <pre className="custom-scrollbar max-h-40 overflow-auto rounded-lg bg-background/60 p-2.5 text-xs leading-relaxed">{inputStr}</pre>}
        {!decided ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setDecided(true); onApprove(); }} className="h-7 gap-1 rounded-lg px-3 text-xs"><Check className="size-3" />{t('approve')}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDecided(true); onDeny(); }} className="h-7 gap-1 rounded-lg px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"><X className="size-3" />{t('deny')}</Button>
          </div>
        ) : (
          <Badge variant="secondary" className="text-[10px]"><Check className="mr-1 size-3" />{t('answered')}</Badge>
        )}
      </div>
    </div>
  );
}

function QuestionMessage({ questions, onAnswer, initialSelections, onPartialSelect }: { questions: AskQuestionItem[]; onAnswer: (_answers: Record<string, string>) => void; initialSelections?: Record<number, string>; onPartialSelect?: (_selections: Record<number, string>) => void }) {
  const OTHER_KEY = '__other__';
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>(initialSelections ?? {});
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({});
  const [answered, setAnswered] = useState(false);
  const [recordingForQuestion, setRecordingForQuestion] = useState<number | null>(null);
  const [transcribingForQuestion, setTranscribingForQuestion] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => { return () => { micStreamRef.current?.getTracks().forEach((t) => t.stop()); }; }, []);

  const startRecording = async (qi: number) => {
    try {
      audioChunksRef.current = [];
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; };
      recorder.start();
      setRecordingForQuestion(qi);
    } catch { /* permission denied */ }
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioChunksRef.current = [];
    setRecordingForQuestion(null);
  };

  const stopAndTranscribe = async (qi: number) => {
    if (!mediaRecorderRef.current || recordingForQuestion !== qi) return;
    setRecordingForQuestion(null);
    setTranscribingForQuestion(qi);
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    await new Promise<void>((resolve) => { const orig = recorder.onstop; recorder.onstop = (e) => { if (orig && typeof orig === 'function') orig.call(recorder, e); resolve(); }; recorder.stop(); });
    try {
      if (audioChunksRef.current.length === 0) { setTranscribingForQuestion(null); return; }
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];
      if (audioBlob.size === 0) { setTranscribingForQuestion(null); return; }
      const fd = new FormData();
      fd.append('audio', audioBlob, 'recording.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Transcription failed');
      const { transcription } = await res.json();
      if (transcription) {
        const existing = (otherTexts[qi] ?? '').trim();
        setOtherTexts((prev) => ({ ...prev, [qi]: existing ? `${existing} ${transcription}` : transcription }));
      }
    } catch { /* silently fail */ } finally { setTranscribingForQuestion(null); }
  };

  const tryAutoSubmit = (nextSel: Record<number, string>, nextOther: Record<number, string>) => {
    const allAnswered = questions.every((_, qi) => {
      const sel = nextSel[qi];
      if (sel === undefined) return false;
      if (sel === OTHER_KEY) return (nextOther[qi] ?? '').trim().length > 0;
      return true;
    });
    if (allAnswered) {
      setAnswered(true);
      const answers: Record<string, string> = {};
      for (const [key, sel] of Object.entries(nextSel)) answers[key] = sel === OTHER_KEY ? (nextOther[Number(key)] ?? '').trim() : sel;
      onAnswer(answers);
    }
  };

  const handleOptionClick = (qi: number, label: string) => {
    if (answered) return;
    const next = { ...selectedOptions, [qi]: label };
    setSelectedOptions(next);
    onPartialSelect?.(next);
    if (label !== OTHER_KEY) tryAutoSubmit(next, otherTexts);
  };

  return (
    <div className="flex justify-start">
      <div className="w-full space-y-3 rounded-xl border border-info/20 bg-info/5 px-4 py-3">
        {questions.map((q, qi) => {
          const isOtherSelected = selectedOptions[qi] === OTHER_KEY;
          const isRecordingThis = recordingForQuestion === qi;
          const isTranscribingThis = transcribingForQuestion === qi;
          return (
            <div key={qi} className="space-y-2">
              <p className="text-sm font-medium">{q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const isSelected = selectedOptions[qi] === opt.label;
                  return (
                    <button key={opt.label} onClick={() => handleOptionClick(qi, opt.label)} disabled={answered}
                      className={cn('group/opt flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                        answered && !isSelected && 'opacity-40',
                        isSelected ? 'bg-info/15 ring-1 ring-info/40' : !answered && 'hover:bg-info/10 active:scale-[0.98]')}>
                      <div className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        isSelected ? 'border-info bg-info' : 'border-muted-foreground/40 group-hover/opt:border-info/60')}>
                        {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{opt.label}</span>
                        {opt.description && <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>}
                      </div>
                      {isSelected && answered && <Check className="size-4 shrink-0 text-info" />}
                    </button>
                  );
                })}

                {/* Other option */}
                <button onClick={() => handleOptionClick(qi, OTHER_KEY)} disabled={answered}
                  className={cn('group/opt flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                    answered && !isOtherSelected && 'opacity-40',
                    isOtherSelected ? 'bg-info/15 ring-1 ring-info/40' : !answered && 'hover:bg-info/10 active:scale-[0.98]')}>
                  <div className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isOtherSelected ? 'border-info bg-info' : 'border-muted-foreground/40 group-hover/opt:border-info/60')}>
                    {isOtherSelected && <div className="size-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">Other</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">Type or speak your own answer</p>
                  </div>
                </button>

                {isOtherSelected && !answered && (
                  <div className="ml-7 mt-1 space-y-2">
                    {isRecordingThis ? (
                      <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-background/60 px-3 py-2">
                        <button type="button" onClick={cancelRecording} className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
                        <AudioWaveform stream={micStreamRef.current} className="h-6 flex-1" />
                        <Button size="sm" onClick={() => stopAndTranscribe(qi)} className="h-7 gap-1 rounded-lg px-2.5 text-xs"><Check className="size-3" />Done</Button>
                      </div>
                    ) : isTranscribingThis ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-info/30 bg-background/60 px-3 py-2.5">
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Transcribing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <MessageSquareText className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text" autoFocus value={otherTexts[qi] ?? ''}
                            onChange={(e) => setOtherTexts((prev) => ({ ...prev, [qi]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && (otherTexts[qi] ?? '').trim()) { e.preventDefault(); tryAutoSubmit(selectedOptions, otherTexts); } }}
                            placeholder="Type your answer..."
                            className="h-9 w-full rounded-lg border border-info/30 bg-background/60 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-info/40"
                          />
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => startRecording(qi)} className="size-9 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-primary" title="Record voice"><Mic className="size-4" /></Button>
                        <Button size="sm" onClick={() => tryAutoSubmit(selectedOptions, otherTexts)} disabled={!(otherTexts[qi] ?? '').trim()} className="h-9 gap-1 rounded-lg px-3 text-xs"><Check className="size-3" />Send</Button>
                      </div>
                    )}
                  </div>
                )}

                {isOtherSelected && answered && (otherTexts[qi] ?? '').trim() && (
                  <div className="ml-7 mt-1 rounded-lg bg-info/10 px-3 py-2 text-sm text-foreground/80">{otherTexts[qi]}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultMessage({ message, isFree, t }: { message: CodeMessageType & { type: 'result' }; isFree?: boolean; t: ReturnType<typeof useScopedI18n<'code.messages'>> }) {
  const totalTokens = (message.inputTokens ?? 0) + (message.outputTokens ?? 0);

  return (
    <div className="flex justify-start">
      <div className={cn('flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-2.5', message.cancelled ? 'bg-caution/5' : 'bg-muted/60')}>
        {!message.cancelled ? <CheckCircle className="size-3.5 text-primary" /> : <AlertTriangle className="size-3.5 text-caution" />}
        {isFree && <span className="flex items-center gap-1 text-xs font-medium text-primary"><Zap className="size-3" />{t('free')}</span>}
        {message.duration != null && <span className="text-xs text-muted-foreground">{(message.duration / 1000).toFixed(1)}s</span>}
        {totalTokens > 0 && <span className="text-xs text-muted-foreground">{totalTokens.toLocaleString()} {t('tokens')}</span>}
        {message.cost != null && message.cost > 0 && <span className="text-xs text-muted-foreground/60">~${message.cost.toFixed(4)}</span>}
      </div>
    </div>
  );
}

function ErrorMessage({ error, subtype }: { error: string; subtype?: string }) {
  return (
    <div className="flex justify-start">
      <div className="space-y-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <XCircle className="size-3.5 text-destructive" />
          {subtype && <Badge variant="destructive" className="text-[10px]">{subtype}</Badge>}
        </div>
        <p className="text-sm text-foreground/80">{error}</p>
      </div>
    </div>
  );
}

function SystemMessage({ text }: { text: string }) {
  return <div className="flex justify-center"><p className="text-xs text-muted-foreground/60">{text}</p></div>;
}
