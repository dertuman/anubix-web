'use client';

import { useCallback, useRef, useState } from 'react';
import axios from 'axios';

import type {
  GenerateArticleRequest,
  GenerateArticleResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateSeoRequest,
  GenerateSeoResponse,
} from '@/lib/ai/types';

type TaskName = 'article' | 'excerpt' | 'seo' | 'image' | 'humanize' | 'all';

interface TaskState {
  running: boolean;
  progress: number;
  error: string | null;
}

const initialTaskState: TaskState = { running: false, progress: 0, error: null };

function useTask() {
  const [state, setState] = useState<TaskState>(initialTaskState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setState({ running: true, progress: 5, error: null });
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState((s) => ({ ...s, progress: Math.min(95, s.progress + 3) }));
    }, 800);
  }, []);

  const finish = useCallback((err?: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setState({ running: false, progress: err ? 0 : 100, error: err ?? null });
    if (!err) setTimeout(() => setState(initialTaskState), 1200);
  }, []);

  return { state, start, finish };
}

export interface AiGenerationHook {
  states: Record<TaskName, TaskState>;
  generateArticle: (_req: GenerateArticleRequest) => Promise<GenerateArticleResponse | null>;
  generateExcerpt: (_title: string, _content: string) => Promise<string | null>;
  generateSeo: (_req: GenerateSeoRequest) => Promise<GenerateSeoResponse | null>;
  generateImage: (_req: GenerateImageRequest) => Promise<GenerateImageResponse | null>;
  humanize: (_content: string) => Promise<string | null>;
}

export function useAiGeneration(): AiGenerationHook {
  const article = useTask();
  const excerpt = useTask();
  const seo = useTask();
  const image = useTask();
  const humanize = useTask();
  const all = useTask();

  const generateArticle = useCallback(async (req: GenerateArticleRequest) => {
    article.start();
    try {
      const res = await axios.post<GenerateArticleResponse>('/api/ai/generate-article', req);
      article.finish();
      return res.data;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      article.finish(msg);
      return null;
    }
  }, [article]);

  const generateExcerpt = useCallback(async (title: string, content: string) => {
    excerpt.start();
    try {
      const res = await axios.post<{ excerpt: string }>('/api/ai/generate-excerpt', { title, content });
      excerpt.finish();
      return res.data.excerpt;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      excerpt.finish(msg);
      return null;
    }
  }, [excerpt]);

  const generateSeo = useCallback(async (req: GenerateSeoRequest) => {
    seo.start();
    try {
      const res = await axios.post<GenerateSeoResponse>('/api/ai/generate-seo', req);
      seo.finish();
      return res.data;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      seo.finish(msg);
      return null;
    }
  }, [seo]);

  const generateImage = useCallback(async (req: GenerateImageRequest) => {
    image.start();
    try {
      const res = await axios.post<GenerateImageResponse>('/api/ai/generate-image', req);
      image.finish();
      return res.data;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      image.finish(msg);
      return null;
    }
  }, [image]);

  const runHumanize = useCallback(async (content: string) => {
    humanize.start();
    try {
      const res = await axios.post<{ content: string }>('/api/ai/humanize', { content });
      humanize.finish();
      return res.data.content;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? err.message : 'Failed';
      humanize.finish(msg);
      return null;
    }
  }, [humanize]);

  return {
    states: {
      article: article.state,
      excerpt: excerpt.state,
      seo: seo.state,
      image: image.state,
      humanize: humanize.state,
      all: all.state,
    },
    generateArticle,
    generateExcerpt,
    generateSeo,
    generateImage,
    humanize: runHumanize,
  };
}
