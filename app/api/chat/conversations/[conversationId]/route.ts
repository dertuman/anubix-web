import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { deleteConversation, fetchMessages, getConversation, updateConversation } from '@/lib/chat-db';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ conversationId: string }> }

/**
 * GET /api/chat/conversations/[conversationId] — Fetch conversation + messages.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { conversationId } = await params;

  try {
    const conversation = await getConversation(sb, conversationId);
    if (!conversation || conversation.email !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await fetchMessages(sb, conversationId);
    return NextResponse.json({ success: true, data: { conversation, messages } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * PATCH /api/chat/conversations/[conversationId] — Update conversation.
 * Body: { title?, model? }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { conversationId } = await params;

  try {
    const conversation = await getConversation(sb, conversationId);
    if (!conversation || conversation.email !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.model !== undefined) updates.model = body.model;

    await updateConversation(sb, conversationId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/conversations/[conversationId] — Delete conversation.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { conversationId } = await params;

  try {
    const conversation = await getConversation(sb, conversationId);
    if (!conversation || conversation.email !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteConversation(sb, conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
