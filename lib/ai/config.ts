import type { AIModel, AIProvider, AITask } from './types';

/**
 * Which provider does each model ID belong to?
 */
export const MODEL_PROVIDER: Record<AIModel, AIProvider> = {
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'gemini-3-pro-preview': 'google',
  'gemini-2-5-pro': 'google',
  'gemini-2-5-flash': 'google',
};

/**
 * SDK-level model IDs. Our internal IDs are stable; these can be swapped out.
 */
export const MODEL_SDK_ID: Record<AIModel, string> = {
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'gemini-3-pro-preview': 'gemini-3-pro-preview',
  'gemini-2-5-pro': 'gemini-2.5-pro',
  'gemini-2-5-flash': 'gemini-2.5-flash',
};

interface TaskConfig {
  primary: AIModel;
  fallback: AIModel;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

/**
 * Default model assignments per task.
 *
 * Strategy: mix providers across the pipeline so the final output isn't the
 * fingerprint of a single model — key for evading AI-content classifiers.
 * Draft with Gemini (creative, long-form), humanize with GPT-4o (different
 * voice & tokenizer), metadata with GPT-4o-mini (cheap structured JSON).
 */
export const TASK_CONFIG: Record<AITask, TaskConfig> = {
  article: {
    primary: 'gemini-3-pro-preview',
    fallback: 'gemini-2-5-pro',
    maxTokens: 6000,
    temperature: 0.85,
    timeoutMs: 120_000,
  },
  excerpt: {
    primary: 'gpt-4o-mini',
    fallback: 'gemini-2-5-flash',
    maxTokens: 300,
    temperature: 0.7,
    timeoutMs: 30_000,
  },
  seo: {
    primary: 'gpt-4o-mini',
    fallback: 'gemini-2-5-flash',
    maxTokens: 600,
    temperature: 0.5,
    timeoutMs: 30_000,
  },
  polish: {
    primary: 'gpt-4o',
    fallback: 'gemini-2-5-pro',
    maxTokens: 6000,
    temperature: 0.9,
    timeoutMs: 120_000,
  },
  humanize: {
    primary: 'gpt-4o',
    fallback: 'gemini-2-5-pro',
    maxTokens: 6000,
    temperature: 1.0,
    timeoutMs: 120_000,
  },
  'image-prompt': {
    primary: 'gpt-4o-mini',
    fallback: 'gemini-2-5-flash',
    maxTokens: 300,
    temperature: 0.8,
    timeoutMs: 30_000,
  },
};

export function getProviderApiKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'google':
      return process.env.GOOGLE_GENAI_API_KEY;
  }
}
