'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  stream: MediaStream | null;
  barCount?: number;
  className?: string;
}

export function AudioWaveform({
  stream,
  barCount = 200,
  className,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const historyRef = useRef<number[]>([]);
  const lastSampleRef = useRef<number>(0);

  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sample amplitude every ~30ms
    if (now - lastSampleRef.current >= 15) {
      lastSampleRef.current = now;
      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      historyRef.current.push(Math.sqrt(sum / buf.length));
    }

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'hsl(240 5% 55%)';

    const history = historyRef.current;
    const gap = 1;
    const barW = Math.max(1, (w - gap * (barCount - 1)) / barCount);
    const cy = h / 2;
    const count = Math.min(history.length, barCount);
    const start = history.length - count;
    const off = barCount - count;

    for (let i = 0; i < count; i++) {
      const barH = Math.max(2, Math.min(1, history[start + i] * 5) * h);
      const x = (i + off) * (barW + gap);
      ctx.beginPath();
      ctx.roundRect(x, cy - barH / 2, barW, barH, barW / 2);
      ctx.fill();
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [barCount]);

  useEffect(() => {
    if (!stream) return;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    historyRef.current = [];
    lastSampleRef.current = 0;
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      source.disconnect();
      analyserRef.current = null;
      audioCtx.close();
      audioCtxRef.current = null;
    };
  }, [stream, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('h-8 w-full', className)}
      style={{ display: 'block' }}
    />
  );
}
