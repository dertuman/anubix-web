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
  barCount = 48,
  className,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const historyRef = useRef<number[]>([]);
  const smoothedRef = useRef<number[]>([]);
  const lastSampleRef = useRef<number>(0);

  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sample amplitude every ~40ms (~25fps for smooth animation)
    if (now - lastSampleRef.current >= 40) {
      lastSampleRef.current = now;
      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      // Aggressive amplification so voice actually registers visually
      // RMS for normal speech is ~0.01-0.15, we want to map that to 0.1-1.0
      const amplified = Math.min(1, rms * 12);
      historyRef.current.push(amplified);

      // Keep history bounded
      if (historyRef.current.length > barCount * 2) {
        historyRef.current = historyRef.current.slice(-barCount);
      }
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

    // Light gray / white bars that stand out on the muted background
    ctx.fillStyle = 'hsl(0 0% 78%)';
    ctx.strokeStyle = 'hsl(0 0% 58%)';
    ctx.lineWidth = 0.5;

    const history = historyRef.current;
    const gap = 2;
    const barW = Math.max(2, (w - gap * (barCount - 1)) / barCount);
    const cy = h / 2;
    const minBarH = 2;

    // Smooth towards target values for fluid animation
    const count = Math.min(history.length, barCount);
    const start = history.length - count;
    const off = barCount - count;

    // Ensure smoothed array is the right size
    while (smoothedRef.current.length < barCount) smoothedRef.current.push(0);

    for (let i = 0; i < barCount; i++) {
      const histIdx = i - off;
      const target = histIdx >= 0 && histIdx < count ? history[start + histIdx] : 0;
      // Smooth interpolation for fluid bar movement
      smoothedRef.current[i] += (target - smoothedRef.current[i]) * 0.3;
      const val = smoothedRef.current[i];
      const barH = Math.max(minBarH, val * h);
      const x = i * (barW + gap);
      ctx.beginPath();
      ctx.roundRect(x, cy - barH / 2, barW, barH, barW / 2);
      ctx.fill();
      ctx.stroke();
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [barCount]);

  useEffect(() => {
    if (!stream) return;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;
    analyserRef.current = analyser;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    historyRef.current = [];
    smoothedRef.current = [];
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
