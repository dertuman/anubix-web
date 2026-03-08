/**
 * Per-session WebSocket connection manager.
 *
 * Imperative class (not a React hook) that manages a single WebSocket
 * connection to one bridge session. Includes:
 * - Full history loading from REST API on first connect
 * - Application-level ping/pong (25s send, 10s timeout)
 * - Exponential backoff reconnection (1s-30s, max 10 attempts, 20% jitter)
 * - Connection health tracking
 * - Message processing + deduplication of replayed approvals/questions
 */

import type {
  AskQuestionItem,
  CodeMessage,
  SlashCommand,
  WsClientFrame,
  WsServerFrame,
} from '@/types/code';
import {
  clearSessionMessages,
  getSessionLastSeq,
  getSessionMessages,
  setSessionLastSeq,
  setSessionMessages,
} from '@/lib/stores/bridge-store';

// ── Types ────────────────────────────────────────────────────

export type ConnectionHealth =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

// ── Helpers ──────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Mark every in-progress assistant_text / tool_use message as complete. */
function completeAllPending(messages: CodeMessage[]): CodeMessage[] {
  return messages.map((m) => {
    if ((m.type === 'assistant_text' || m.type === 'tool_use') && !m.isComplete) {
      return { ...m, isComplete: true };
    }
    return m;
  });
}

function rebuildMessagesFromPayloads(
  payloads: Array<{ seq: number; payload: { type: string; [key: string]: unknown } }>,
): { messages: CodeMessage[]; lastSeq: number } {
  const messages: CodeMessage[] = [];
  let lastSeq = 0;
  let currentTextId: string | null = null;

  for (const entry of payloads) {
    lastSeq = entry.seq;
    const p = entry.payload;

    switch (p.type) {
      case 'session_init':
        break;

      case 'user_message': {
        currentTextId = null;
        messages.push({
          id: makeId(),
          ts: (p.timestamp as number) || Date.now(),
          type: 'user' as const,
          text: p.content as string,
        });
        break;
      }

      case 'text_delta': {
        const text = p.text as string;
        if (currentTextId) {
          const last = messages[messages.length - 1];
          if (last?.type === 'assistant_text' && last.id === currentTextId) {
            messages[messages.length - 1] = { ...last, text: last.text + text };
          }
        } else {
          const id = makeId();
          currentTextId = id;
          messages.push({ id, ts: Date.now(), type: 'assistant_text' as const, text, isComplete: false });
        }
        break;
      }

      case 'tool_start': {
        currentTextId = null;
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.type === 'assistant_text' && !m.isComplete) {
            messages[i] = { ...m, isComplete: true };
          }
        }
        messages.push({
          id: makeId(), ts: Date.now(), type: 'tool_use' as const,
          toolName: p.toolName as string,
          toolInput: p.toolInput as Record<string, unknown> | undefined,
          isComplete: false,
        });
        break;
      }

      case 'tool_end': {
        const toolName = p.toolName as string;
        const endTime = (p.timestamp as number) || Date.now();
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.type === 'tool_use' && m.toolName === toolName && !m.isComplete) {
            messages[i] = { ...m, isComplete: true, durationMs: endTime - m.ts };
            break;
          }
        }
        break;
      }

      case 'approval_request': {
        currentTextId = null;
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.type === 'assistant_text' && !m.isComplete)
            messages[i] = { ...m, isComplete: true };
          if (m.type === 'tool_use' && !m.isComplete)
            messages[i] = { ...m, isComplete: true };
        }
        messages.push({
          id: makeId(), ts: Date.now(), type: 'approval_request' as const,
          toolName: p.toolName as string,
          toolInput: p.toolInput as Record<string, unknown> | undefined,
        });
        break;
      }

      case 'ask_question': {
        currentTextId = null;
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.type === 'assistant_text' && !m.isComplete)
            messages[i] = { ...m, isComplete: true };
          if (m.type === 'tool_use' && !m.isComplete)
            messages[i] = { ...m, isComplete: true };
        }
        messages.push({
          id: makeId(), ts: Date.now(), type: 'question' as const,
          questions: p.questions as AskQuestionItem[],
        });
        break;
      }

      case 'result': {
        currentTextId = null;
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.type === 'assistant_text' && !m.isComplete) messages[i] = { ...m, isComplete: true };
          if (m.type === 'tool_use' && !m.isComplete) messages[i] = { ...m, isComplete: true };
        }
        messages.push({
          id: makeId(), ts: Date.now(), type: 'result' as const,
          resultText: (p.result as string) ?? '',
          cost: p.cost as number | undefined,
          duration: p.duration as number | undefined,
          inputTokens: p.inputTokens as number | undefined,
          outputTokens: p.outputTokens as number | undefined,
          cancelled: p.cancelled as boolean | undefined,
        });
        break;
      }

      case 'error': {
        currentTextId = null;
        messages.push({
          id: makeId(), ts: Date.now(), type: 'error' as const,
          error: (p.message as string) ?? 'Unknown error',
          subtype: p.subtype as string | undefined,
        });
        break;
      }

      case 'system_message': {
        currentTextId = null;
        const text = (p.message as string) || (p.text as string) || (p.content as string) || '';
        if (text) {
          messages.push({ id: makeId(), ts: Date.now(), type: 'system' as const, text });
        }
        break;
      }

      default:
        break;
    }
  }

  // Mark trailing incomplete assistant text as complete
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.type === 'assistant_text' && !m.isComplete) {
      messages[i] = { ...m, isComplete: true };
      break;
    }
  }

  return { messages, lastSeq };
}

// ── Constants ────────────────────────────────────────────────

const PING_INTERVAL_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

// ── SessionConnection ────────────────────────────────────────

export class SessionConnection {
  readonly sessionId: string;
  private baseUrl: string;
  private apiKey: string;
  private onChange: () => void;
  private ws: WebSocket | null = null;

  messages: CodeMessage[];
  isBusy = false;
  connectionHealth: ConnectionHealth = 'disconnected';
  slashCommands: SlashCommand[] = [];

  private seq = 0;
  private historyLoaded = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalClose = false;
  private currentTextId: string | null = null;

  constructor(sessionId: string, baseUrl: string, apiKey: string, onChange: () => void) {
    this.sessionId = sessionId;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.onChange = onChange;
    this.messages = getSessionMessages(sessionId) as CodeMessage[];
    this.seq = getSessionLastSeq(sessionId);
  }

  // ── Lifecycle ──────────────────────────────────────────────

  connect() {
    this.intentionalClose = false;
    this.loadHistoryThenConnect();
  }

  disconnect() {
    this.intentionalClose = true;
    this.clearAllTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close(1000, 'intentional');
      this.ws = null;
    }
    this.connectionHealth = 'disconnected';
    this.persistMessages();
    this.onChange();
  }

  retry() {
    this.reconnectAttempt = 0;
    this.intentionalClose = false;
    this.loadHistoryThenConnect();
  }

  destroy() {
    this.disconnect();
  }

  // ── Actions ────────────────────────────────────────────────

  private send(frame: WsClientFrame) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  sendMessage(content: string, images?: { base64: string; mimeType: string }[]) {
    this.send({ type: 'message', content, ...(images?.length ? { images } : {}) });
  }

  approve() { this.send({ type: 'approval', decision: 'allow' }); }
  deny() { this.send({ type: 'approval', decision: 'deny' }); }
  answerQuestion(answers: Record<string, string>) { this.send({ type: 'question_answer', answers }); }

  abort() {
    this.send({ type: 'abort' });
    this.isBusy = false;
    this.onChange();
  }

  clearConversation() {
    this.send({ type: 'message', content: '/clear' });
    this.messages = [];
    this.isBusy = false;
    this.seq = 0;
    clearSessionMessages(this.sessionId);
    this.onChange();
  }

  switchModel(model?: string) {
    this.send({ type: 'switch_model', model });
  }

  addUserMessage(msg: CodeMessage) {
    this.messages = [...this.messages, msg];
    this.isBusy = true;
    this.onChange();
  }

  // ── Internal: History load + WebSocket ─────────────────────

  private async loadHistoryThenConnect() {
    if (!this.historyLoaded) {
      this.connectionHealth = 'connecting';
      this.onChange();

      try {
        const httpBase = this.baseUrl.replace(/^ws(s?):\/\//, 'http$1://');
        const res = await fetch(`${httpBase}/_bridge/sessions/${this.sessionId}/messages`, {
          headers: { 'x-api-key': this.apiKey },
        });

        if (res.ok) {
          const data = await res.json();
          const entries = data.data as Array<{ seq: number; payload: { type: string; [key: string]: unknown } }>;
          if (entries?.length) {
            const rebuilt = rebuildMessagesFromPayloads(entries);
            this.messages = rebuilt.messages;
            this.seq = rebuilt.lastSeq;
            this.onChange();
          }
          this.historyLoaded = true;
          this.persistMessages();
        }
      } catch (err) {
        console.error('Failed to load session history:', err);
        // Fall through — still connect WS with local cache
      }
    }

    this.doConnect(this.reconnectAttempt > 0);
  }

  private doConnect(isReconnect: boolean) {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.stopPingLoop();

    this.connectionHealth = isReconnect ? 'reconnecting' : 'connecting';
    this.onChange();

    const base = this.baseUrl.replace(/^http(s?):\/\//, 'ws$1://');
    let wsUrl = `${base}/ws/${this.sessionId}?key=${encodeURIComponent(this.apiKey)}`;
    if (this.seq > 0) wsUrl += `&lastSeq=${this.seq}`;

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.connectionHealth = 'connected';
      this.onChange();
      this.startPingLoop();
    };

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data as string) as WsServerFrame;
        if (frame.type === 'pong') { this.clearPongTimeout(); return; }
        this.processFrame(frame);
      } catch (err) { console.error('Failed to parse WebSocket frame:', err); }
    };

    ws.onclose = (event) => {
      this.ws = null;
      this.stopPingLoop();
      if (this.intentionalClose || event.code === 1000 || event.code === 4001) {
        if (this.connectionHealth !== 'disconnected') {
          this.connectionHealth = 'disconnected';
          this.onChange();
        }
        return;
      }
      this.scheduleReconnect();
    };

    ws.onerror = () => { /* onclose handles reconnection */ };
  }

  // ── Internal: Reconnection ─────────────────────────────────

  private scheduleReconnect() {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.connectionHealth = 'failed';
      this.onChange();
      return;
    }

    this.connectionHealth = 'reconnecting';
    this.onChange();

    const delay = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt), MAX_RECONNECT_DELAY_MS);
    const totalDelay = Math.round(delay + delay * 0.2 * Math.random());

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.doConnect(true);
    }, totalDelay);
  }

  // ── Internal: Ping / Pong ──────────────────────────────────

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.pongTimeout = setTimeout(() => this.ws?.close(), PONG_TIMEOUT_MS);
      }
    }, PING_INTERVAL_MS);
  }

  private stopPingLoop() {
    if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
    this.clearPongTimeout();
  }

  private clearPongTimeout() {
    if (this.pongTimeout) { clearTimeout(this.pongTimeout); this.pongTimeout = null; }
  }

  private clearAllTimers() {
    this.stopPingLoop();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  // ── Internal: Persistence ──────────────────────────────────

  private persistMessages() {
    setSessionMessages(this.sessionId, this.messages);
    setSessionLastSeq(this.sessionId, this.seq);
  }

  // ── Internal: Frame processing ─────────────────────────────

  private processFrame(frame: WsServerFrame) {
    if (frame.seq !== undefined) {
      this.seq = frame.seq as number;
      setSessionLastSeq(this.sessionId, this.seq);
    }

    switch (frame.type) {
      case 'user_message': {
        const lastMsg = this.messages[this.messages.length - 1];
        const content = frame.content as string;
        if (lastMsg?.type === 'user' && lastMsg.text === content) break;
        this.currentTextId = null;
        this.messages = [...this.messages, {
          id: makeId(), ts: (frame.timestamp as number) || Date.now(),
          type: 'user' as const, text: content,
        }];
        this.isBusy = true;
        this.onChange();
        break;
      }

      case 'text_delta': {
        const text = frame.text as string;
        if (this.currentTextId) {
          const lastIdx = this.messages.length - 1;
          const last = this.messages[lastIdx];
          if (last?.type === 'assistant_text' && last.id === this.currentTextId) {
            const updated = [...this.messages];
            updated[lastIdx] = { ...last, text: last.text + text };
            this.messages = updated;
          }
        } else {
          const id = makeId();
          this.currentTextId = id;
          this.messages = [...completeAllPending(this.messages), {
            id, ts: Date.now(), type: 'assistant_text' as const, text, isComplete: false,
          }];
        }
        this.onChange();
        break;
      }

      case 'tool_start': {
        this.currentTextId = null;
        this.messages = [
          ...completeAllPending(this.messages),
          {
            id: makeId(), ts: Date.now(), type: 'tool_use' as const,
            toolName: frame.toolName as string,
            toolInput: frame.toolInput as Record<string, unknown> | undefined,
            isComplete: false,
          },
        ];
        this.onChange();
        break;
      }

      case 'tool_end': {
        const toolName = frame.toolName as string;
        const now = Date.now();
        this.messages = this.messages.map((m) =>
          m.type === 'tool_use' && m.toolName === toolName && !m.isComplete
            ? { ...m, isComplete: true, durationMs: now - m.ts } : m
        );
        this.onChange();
        break;
      }

      case 'approval_request': {
        const last = this.messages[this.messages.length - 1];
        if (last?.type === 'approval_request' && last.toolName === (frame.toolName as string)) break;
        this.currentTextId = null;
        this.messages = [
          ...completeAllPending(this.messages),
          {
            id: makeId(), ts: Date.now(), type: 'approval_request' as const,
            toolName: frame.toolName as string,
            toolInput: frame.toolInput as Record<string, unknown> | undefined,
          },
        ];
        this.onChange();
        break;
      }

      case 'ask_question': {
        const last = this.messages[this.messages.length - 1];
        if (last?.type === 'question') break;
        this.currentTextId = null;
        this.messages = [
          ...completeAllPending(this.messages),
          { id: makeId(), ts: Date.now(), type: 'question' as const, questions: frame.questions as AskQuestionItem[] },
        ];
        this.onChange();
        break;
      }

      case 'result': {
        this.currentTextId = null;
        this.isBusy = false;
        this.messages = [
          ...completeAllPending(this.messages),
          {
            id: makeId(), ts: Date.now(), type: 'result' as const,
            resultText: (frame.result as string) ?? '',
            cost: frame.cost as number | undefined,
            duration: frame.duration as number | undefined,
            inputTokens: frame.inputTokens as number | undefined,
            outputTokens: frame.outputTokens as number | undefined,
            cancelled: frame.cancelled as boolean | undefined,
          },
        ];
        this.persistMessages();
        this.onChange();
        break;
      }

      case 'error': {
        this.currentTextId = null;
        this.isBusy = false;
        this.messages = [
          ...completeAllPending(this.messages),
          {
          id: makeId(), ts: Date.now(), type: 'error' as const,
          error: (frame.message as string) ?? 'Unknown error',
          subtype: frame.subtype as string | undefined,
        }];
        this.onChange();
        break;
      }

      case 'session_status': {
        this.isBusy = (frame.status as string) === 'busy';
        this.onChange();
        break;
      }

      case 'session_cleared': {
        this.messages = [];
        this.isBusy = false;
        this.seq = 0;
        this.currentTextId = null;
        clearSessionMessages(this.sessionId);
        this.onChange();
        break;
      }

      case 'system_message': {
        this.currentTextId = null;
        const text = (frame.message as string) || (frame.text as string) || (frame.content as string) || '';
        if (text) {
          this.messages = [
            ...this.messages,
            { id: makeId(), ts: Date.now(), type: 'system' as const, text },
          ];
          this.onChange();
        }
        break;
      }

      case 'session_init':
        break;

      case 'commands_available': {
        this.slashCommands = frame.commands as SlashCommand[];
        this.onChange();
        break;
      }

      case 'replay_end': {
        this.persistMessages();
        break;
      }

      default:
        console.warn('[WS] Unhandled frame type:', frame.type, frame);
        break;
    }
  }
}
