/**
 * Server-side AI completion router. Wraps OpenAI, Google, and Perplexity
 * behind a single `complete()` call.
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

import { MODEL_PROVIDER, MODEL_SDK_ID, TASK_CONFIG, getProviderApiKey } from './config';
import type { AICompleteOptions, AICompletionResult, AIModel, AIProvider } from './types';

export async function complete(opts: AICompleteOptions): Promise<AICompletionResult> {
  const cfg = TASK_CONFIG[opts.task];
  const model = opts.model ?? cfg.primary;
  const provider = MODEL_PROVIDER[model];

  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    throw new Error(`Missing API key for provider "${provider}". Set the matching env var.`);
  }

  const temperature = opts.temperature ?? cfg.temperature;
  const maxTokens = opts.maxTokens ?? cfg.maxTokens;
  const jsonMode = opts.jsonMode ?? opts.task === 'seo';

  switch (provider) {
    case 'openai':
      return completeOpenAI({ model, apiKey, temperature, maxTokens, jsonMode, ...opts });
    case 'google':
      return completeGoogle({ model, apiKey, temperature, maxTokens, jsonMode, ...opts });
    case 'perplexity':
      return completePerplexity({ model, apiKey, temperature, maxTokens, jsonMode, ...opts });
    default:
      throw new Error(`Unknown provider: ${provider satisfies never}`);
  }
}

export async function completeWithFallback(opts: AICompleteOptions): Promise<AICompletionResult> {
  const cfg = TASK_CONFIG[opts.task];
  try {
    return await complete(opts);
  } catch (err) {
    const fallbackModel = cfg.fallback;
    if (opts.model === fallbackModel) throw err;
    console.warn(
      `[ai] primary model failed for task "${opts.task}": ${(err as Error).message}. Falling back to ${fallbackModel}.`,
    );
    return complete({ ...opts, model: fallbackModel });
  }
}

interface ProviderCallOpts extends AICompleteOptions {
  model: AIModel;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  jsonMode: boolean;
}

async function completeOpenAI(opts: ProviderCallOpts): Promise<AICompletionResult> {
  const client = new OpenAI({ apiKey: opts.apiKey });
  const res = await client.chat.completions.create({
    model: MODEL_SDK_ID[opts.model],
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  });

  const text = res.choices[0]?.message?.content ?? '';
  return {
    text,
    model: opts.model,
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
      totalTokens: res.usage?.total_tokens ?? 0,
    },
  };
}

async function completeGoogle(opts: ProviderCallOpts): Promise<AICompletionResult> {
  const client = new GoogleGenAI({ apiKey: opts.apiKey });
  const res = await client.models.generateContent({
    model: MODEL_SDK_ID[opts.model],
    contents: [{ role: 'user', parts: [{ text: opts.user }] }],
    config: {
      systemInstruction: opts.system,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
      ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  });

  const text = res.text ?? '';
  const usage = res.usageMetadata;

  return {
    text,
    model: opts.model,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
    },
  };
}

// Perplexity exposes an OpenAI-compatible /chat/completions API. sonar-pro is
// search-grounded, so we use it for RSS-seeded rewrites — fresh facts, fewer hallucinations.
async function completePerplexity(opts: ProviderCallOpts): Promise<AICompletionResult> {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: 'https://api.perplexity.ai' });
  const res = await client.chat.completions.create({
    model: MODEL_SDK_ID[opts.model],
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  });

  const text = res.choices[0]?.message?.content ?? '';
  return {
    text,
    model: opts.model,
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
      totalTokens: res.usage?.total_tokens ?? 0,
    },
  };
}

export function getProviderForModel(model: AIModel): AIProvider {
  return MODEL_PROVIDER[model];
}
