import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { getConversation, updateConversation } from '@/lib/chat-db';
import { createSupabaseAdmin } from '@/lib/supabase/server';

interface Params { params: Promise<{ conversationId: string }> }

/**
 * POST /api/chat/conversations/[conversationId]/share — Toggle sharing.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { conversationId } = await params;

  try {
    const conversation = await getConversation(sb, conversationId);
    if (!conversation || conversation.email !== email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isShared = !conversation.is_shared;
    const updates: { is_shared: boolean; share_id?: string } = { is_shared: isShared };

    // Generate share_id on first share
    if (isShared && !conversation.share_id) {
      updates.share_id = crypto.randomBytes(12).toString('hex');
    }

    await updateConversation(sb, conversationId, updates);

    // Fetch updated conversation
    const { data: updated } = await sb
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
