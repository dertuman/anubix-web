import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { fetchMessages, getConversationByShareId } from '@/lib/chat-db';
import { createSupabaseAdmin } from '@/lib/supabase/server';

import { SharedConversationView } from './shared-conversation-view';

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const sb = createSupabaseAdmin();
  if (!sb) return { title: 'Shared Conversation' };

  const conversation = await getConversationByShareId(sb, shareId);
  if (!conversation) return { title: 'Shared Conversation' };

  return {
    title: `${conversation.title} — Shared on Anubix`,
    description: `A shared conversation on Anubix with ${conversation.message_count} messages.`,
    openGraph: {
      title: conversation.title,
      description: `A shared conversation on Anubix with ${conversation.message_count} messages.`,
      type: 'article',
    },
  };
}

export default async function SharedConversationPage({ params }: PageProps) {
  const { shareId } = await params;
  const sb = createSupabaseAdmin();
  if (!sb) notFound();

  const conversation = await getConversationByShareId(sb, shareId);
  if (!conversation) notFound();

  const messages = await fetchMessages(sb, conversation.id);

  const conversationData = {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    message_count: conversation.message_count,
    created_at: conversation.created_at,
  };

  return <SharedConversationView conversation={conversationData} messages={messages} />;
}
