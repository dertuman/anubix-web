import { NextRequest, NextResponse } from 'next/server';

import { getAuthEmail } from '@/lib/auth-utils';
import { createConversation, fetchMessages, getConversationByShareId, saveMessage } from '@/lib/chat-db';
import { createClerkSupabaseClient, createSupabaseAdmin } from '@/lib/supabase/server';

interface Params { params: Promise<{ shareId: string }> }

/**
 * POST /api/chat/share/[shareId]/fork — Fork a shared conversation.
 * Creates a copy owned by the authenticated user.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use admin client to read the shared conversation (no RLS restrictions)
  const adminSb = createSupabaseAdmin();
  if (!adminSb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const userSb = await createClerkSupabaseClient();
  if (!userSb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { shareId } = await params;

  try {
    const original = await getConversationByShareId(adminSb, shareId);
    if (!original) {
      return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 });
    }

    // Create the forked conversation
    const forkedId = await createConversation(
      userSb,
      email,
      original.model,
      `${original.title} (fork)`,
    );

    // Copy all messages
    const originalMessages = await fetchMessages(adminSb, original.id);
    for (const msg of originalMessages) {
      await saveMessage(
        userSb,
        forkedId,
        msg.role,
        msg.content,
        msg.images,
        null,
        msg.model,
      );
    }

    // Update message count
    if (originalMessages.length > 0) {
      await userSb
        .from('conversations')
        .update({ message_count: originalMessages.length })
        .eq('id', forkedId);
    }

    // Fetch the full forked conversation
    const { data: forked } = await userSb
      .from('conversations')
      .select('*')
      .eq('id', forkedId)
      .single();

    return NextResponse.json({ success: true, data: forked });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
