/**
 * Supabase data access layer for chat conversations and messages.
 * Compatible with anubix-native — same tables, same schema.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types/supabase';
import type { ChatConversation, ChatMessage, StoredFileAttachment } from '@/types/chat';

type Sb = SupabaseClient<Database>;

// =============================================================================
// Conversations
// =============================================================================

export async function createConversation(
  sb: Sb,
  email: string,
  model: string,
  title?: string,
): Promise<string> {
  const { data, error } = await sb
    .from('conversations')
    .insert({ email, model, title: title || 'New Conversation' })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function fetchConversations(
  sb: Sb,
  email: string,
  limit = 50,
): Promise<ChatConversation[]> {
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .eq('email', email)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data as unknown as ChatConversation[];
}

export async function deleteConversation(sb: Sb, id: string): Promise<void> {
  const { error } = await sb.from('conversations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateConversation(
  sb: Sb,
  id: string,
  updates: { title?: string; model?: string; is_shared?: boolean; share_id?: string | null },
): Promise<void> {
  const { error } = await sb.from('conversations').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getConversation(
  sb: Sb,
  id: string,
): Promise<ChatConversation | null> {
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as ChatConversation;
}

export async function getConversationByShareId(
  sb: Sb,
  shareId: string,
): Promise<ChatConversation | null> {
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .eq('share_id', shareId)
    .eq('is_shared', true)
    .single();

  if (error) return null;
  return data as unknown as ChatConversation;
}

export async function incrementMessageCount(
  sb: Sb,
  id: string,
  increment = 1,
): Promise<void> {
  // Try atomic RPC first, fall back to read-then-write.
  // The RPC may not exist in older deployments — the fallback handles that.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (sb.rpc as any)('increment_message_count', {
    conv_id: id,
    amount: increment,
  });

  if (rpcError) {
    // Fallback: read-then-write (safe enough for single-user conversations)
    const { data } = await sb
      .from('conversations')
      .select('message_count')
      .eq('id', id)
      .single();

    if (data) {
      await sb
        .from('conversations')
        .update({
          message_count: (data.message_count ?? 0) + increment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  }
}

// =============================================================================
// Messages
// =============================================================================

export async function saveMessage(
  sb: Sb,
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  images?: Array<{ uri: string; base64: string }> | null,
  files?: StoredFileAttachment[] | null,
  model?: string | null,
): Promise<string> {
  const { data, error } = await sb
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      images: (images as Json) || null,
      files: (files as Json) || null,
      model: model || null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function fetchMessages(
  sb: Sb,
  conversationId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data as unknown as ChatMessage[];
}
