import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createConversation, fetchConversations } from '@/lib/chat-db';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/chat/conversations — List all conversations for the user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const conversations = await fetchConversations(sb, userId);
    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error('[chat/conversations] Error:', (error as Error).message);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

/**
 * POST /api/chat/conversations — Create a new conversation.
 * Body: { model: string, title?: string }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const { model, title } = await req.json();
    if (!model) return NextResponse.json({ error: 'Model is required' }, { status: 400 });

    const id = await createConversation(sb, userId, model, title);

    // Fetch the full created conversation
    const { data } = await sb
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[chat/conversations] Error:', (error as Error).message);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
