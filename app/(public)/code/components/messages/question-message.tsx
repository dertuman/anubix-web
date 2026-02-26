'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, MessageSquareText, Mic, X } from 'lucide-react';
import type { AskQuestionItem } from '@/types/code';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { AudioWaveform } from '@/components/ui/audio-waveform';
import { Button } from '@/components/ui/button';

export interface QuestionMessageProps {
  questions: AskQuestionItem[];
  onAnswer: (_answers: Record<string, string>) => void;
  initialSelections?: Record<number, string>;
  onPartialSelect?: (_selections: Record<number, string>) => void;
}

export function QuestionMessage({ questions, onAnswer, initialSelections, onPartialSelect }: QuestionMessageProps) {
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
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
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
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally { setTranscribingForQuestion(null); }
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
      <div className="w-full space-y-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
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
                        isSelected ? 'bg-primary/15 ring-1 ring-primary/40' : !answered && 'hover:bg-primary/10 active:scale-[0.98]')}>
                      <div className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40 group-hover/opt:border-primary/60')}>
                        {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{opt.label}</span>
                        {opt.description && <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>}
                      </div>
                      {isSelected && answered && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}

                {/* Other option */}
                <button onClick={() => handleOptionClick(qi, OTHER_KEY)} disabled={answered}
                  className={cn('group/opt flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                    answered && !isOtherSelected && 'opacity-40',
                    isOtherSelected ? 'bg-primary/15 ring-1 ring-primary/40' : !answered && 'hover:bg-primary/10 active:scale-[0.98]')}>
                  <div className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isOtherSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40 group-hover/opt:border-primary/60')}>
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
                      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-background/60 px-3 py-2">
                        <button type="button" onClick={cancelRecording} className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"><X className="size-4" /></button>
                        <AudioWaveform stream={micStreamRef.current} className="h-6 flex-1" />
                        <Button size="sm" onClick={() => stopAndTranscribe(qi)} className="h-7 gap-1 rounded-lg px-2.5 text-xs"><Check className="size-3" />Done</Button>
                      </div>
                    ) : isTranscribingThis ? (
                      <div className="flex items-center justify-center gap-3 rounded-lg border border-primary/30 bg-background/60 px-3 py-2.5">
                        <Loader variant="dots" size={18} />
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
                            className="h-9 w-full rounded-lg border border-primary/30 bg-background/60 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/40"
                          />
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => startRecording(qi)} className="size-9 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-primary" title="Record voice"><Mic className="size-4" /></Button>
                        <Button size="sm" onClick={() => tryAutoSubmit(selectedOptions, otherTexts)} disabled={!(otherTexts[qi] ?? '').trim()} className="h-9 gap-1 rounded-lg px-3 text-xs"><Check className="size-3" />Send</Button>
                      </div>
                    )}
                  </div>
                )}

                {isOtherSelected && answered && (otherTexts[qi] ?? '').trim() && (
                  <div className="ml-7 mt-1 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground/80">{otherTexts[qi]}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
