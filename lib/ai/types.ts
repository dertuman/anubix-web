/**
 * Shared AI types for the blog generation pipeline.
 */

export type AIProvider = 'openai' | 'google';

export type AIModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gemini-3-pro-preview'
  | 'gemini-2-5-pro'
  | 'gemini-2-5-flash';

export type AITask = 'article' | 'excerpt' | 'seo' | 'polish' | 'humanize' | 'image-prompt';

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AICompletionResult {
  text: string;
  model: AIModel;
  usage: AIUsage;
}

export interface AICompleteOptions {
  task: AITask;
  system: string;
  user: string;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
}

export const BLOG_CATEGORIES = [
  'Tutorials',
  'Product Updates',
  'Case Studies',
  'AI Development',
  'Integrations',
  'Comparisons',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export interface GenerateArticleRequest {
  title: string;
  topic?: string;
  category?: BlogCategory;
  additionalContext?: string;
  includeAnubixMention?: boolean;
  model?: AIModel;
}

export interface GenerateArticleResponse {
  content: string;
  excerpt?: string;
  readingTime: number;
  model: AIModel;
  usage: AIUsage;
  humanizePasses: number;
}

export interface GenerateSeoRequest {
  title: string;
  excerpt: string;
  content: string;
  model?: AIModel;
}

export interface GenerateSeoResponse {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImageAlt: string;
}

export interface GenerateImageRequest {
  title: string;
  topic?: string;
  category?: BlogCategory;
  customPrompt?: string;
}

export interface GenerateImageResponse {
  url: string;
  alt: string;
  prompt: string;
}
