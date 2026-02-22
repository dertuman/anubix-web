// ── AI Providers & Models ──────────────────────────────────────

export type AIProvider = 'openai' | 'google' | 'anthropic';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: AIProvider;
  supportsVision: boolean;
  hasSearch?: boolean;
}

/**
 * Model catalogue — keep in sync with anubix-native `model-store.ts`.
 * The `id` field is what gets stored in the `conversations.model` and
 * `messages.model` columns and is passed directly to the provider SDK.
 */
export const AI_MODELS: AIModel[] = [
  // OpenAI
  { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest & most capable', provider: 'openai', supportsVision: true },
  { id: 'gpt-5', name: 'GPT-5', description: 'Powerful & reliable', provider: 'openai', supportsVision: true },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Fast & capable', provider: 'openai', supportsVision: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable', provider: 'openai', supportsVision: true },
  // Google Gemini
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Most intelligent (1M context)', provider: 'google', supportsVision: true, hasSearch: true },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Latest & fastest (1M context)', provider: 'google', supportsVision: true, hasSearch: true },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & powerful', provider: 'google', supportsVision: true, hasSearch: true },
  // Anthropic
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast & intelligent', provider: 'anthropic', supportsVision: true },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable', provider: 'anthropic', supportsVision: true },
] as const;

export type ModelId = (typeof AI_MODELS)[number]['id'];

export const AI_MODELS_MAP: Record<string, AIModel> = Object.fromEntries(
  AI_MODELS.map((m) => [m.id, m]),
);

export const DEFAULT_MODEL: ModelId = 'gemini-3-flash-preview';

/** Provider precedence for auto-selecting the best available model. */
export const PROVIDER_PRECEDENCE: AIProvider[] = ['google', 'openai', 'anthropic'];

// ── File support per provider ──────────────────────────────────

export type FileCategory = 'image' | 'audio' | 'video' | 'pdf' | 'text';

export const MODEL_FILE_SUPPORT: Record<AIProvider, Set<FileCategory>> = {
  openai: new Set(['image', 'audio', 'text']),
  google: new Set(['image', 'audio', 'video', 'pdf', 'text']),
  anthropic: new Set(['image', 'text']),
};

// ── Stored file attachment (persisted in JSONB) ────────────────

export interface StoredFileAttachment {
  name: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  /** Base64 data URL — only persisted for images */
  data?: string;
}

// ── Database types (matching Supabase schema) ──────────────────

export interface ChatConversation {
  id: string;
  clerk_user_id: string;
  title: string;
  model: string;
  message_count: number;
  is_shared: boolean;
  share_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Legacy image format from native app: [{uri, base64}] */
  images: Array<{ uri: string; base64: string }> | null;
  /** Rich file attachments from web app */
  files: StoredFileAttachment[] | null;
  /** Which model generated this response */
  model: string | null;
  created_at: string;
}

// ── API key record ─────────────────────────────────────────────

export interface ChatApiKey {
  id: string;
  clerk_user_id: string;
  provider: AIProvider;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
  created_at: string;
  updated_at: string;
}
