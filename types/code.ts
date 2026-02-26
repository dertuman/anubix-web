// ── File attachments ────────────────────────────────────────

export type FileCategory = 'image' | 'audio' | 'video' | 'text' | 'pdf';

export interface FileAttachment {
  id: string;
  name: string;
  mimeType: string;
  category: FileCategory;
  size: number;
  data?: string;
  textContent?: string;
}

// ── Bridge session ──────────────────────────────────────────

export interface BridgeSession {
  id: string;
  name: string;
  repoPath: string;
  repoPaths?: string[];
  status: 'idle' | 'busy' | 'error';
  createdAt: number;
  lastActiveAt: number;
  conversationId?: string;
  mode?: 'sdk' | 'cli';
  model?: string;
}

// ── Slash commands ──────────────────────────────────────────

export interface SlashCommand {
  name: string;
  description: string;
  argHint?: string;
}

// ── Ask-question payload ────────────────────────────────────

export interface AskQuestionItem {
  question: string;
  options: { label: string; description?: string }[];
}

// ── Display messages (discriminated union) ───────────────────

interface BaseMessage {
  id: string;
  ts: number;
}

export interface CodeUserMessage extends BaseMessage {
  type: 'user';
  text: string;
  images?: string[];
  files?: FileAttachment[];
}

export interface CodeAssistantTextMessage extends BaseMessage {
  type: 'assistant_text';
  text: string;
  isComplete: boolean;
}

export interface CodeToolUseMessage extends BaseMessage {
  type: 'tool_use';
  toolName: string;
  toolInput?: Record<string, unknown>;
  isComplete: boolean;
  durationMs?: number;
}

export interface CodeApprovalRequestMessage extends BaseMessage {
  type: 'approval_request';
  toolName: string;
  toolInput?: Record<string, unknown>;
}

export interface CodeQuestionMessage extends BaseMessage {
  type: 'question';
  questions: AskQuestionItem[];
}

export interface CodeResultMessage extends BaseMessage {
  type: 'result';
  resultText: string;
  cost?: number;
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  cancelled?: boolean;
}

export interface CodeErrorMessage extends BaseMessage {
  type: 'error';
  error: string;
  subtype?: string;
}

export interface CodeSystemMessage extends BaseMessage {
  type: 'system';
  text: string;
}

export type CodeMessage =
  | CodeUserMessage
  | CodeAssistantTextMessage
  | CodeToolUseMessage
  | CodeApprovalRequestMessage
  | CodeQuestionMessage
  | CodeResultMessage
  | CodeErrorMessage
  | CodeSystemMessage;

// ── WebSocket client -> server frames ────────────────────────

export type WsClientFrame =
  | { type: 'message'; content: string; images?: { base64: string; mimeType: string }[] }
  | { type: 'approval'; decision: 'allow' | 'deny'; message?: string }
  | { type: 'question_answer'; answers: Record<string, string> }
  | { type: 'abort' }
  | { type: 'ping' }
  | { type: 'switch_model'; model?: string };

// ── WebSocket server -> client frames ────────────────────────

export interface WsServerFrame {
  type: string;
  seq?: number;
  [key: string]: unknown;
}
