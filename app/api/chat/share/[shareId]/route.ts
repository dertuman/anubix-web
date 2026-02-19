import { NextRequest, NextResponse } from 'next/server';

import { fetchMessages, getConversationByShareId } from '@/lib/chat-db';
import { createSupabaseAdmin } from '@/lib/supabase/server';

interface Params { params: Promise<{ shareId: string }> }

/**
 * GET /api/chat/share/[shareId] — Public: fetch a shared conversation.
 * No authentication required.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const sb = createSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { shareId } = await params;

  try {
    const conversation = await getConversationByShareId(sb, shareId);
    if (!conversation) {
      return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 });
    }

    const messages = await fetchMessages(sb, conversation.id);

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          model: conversation.model,
          message_count: conversation.message_count,
          created_at: conversation.created_at,
        },
        messages,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
