import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import type { AIProvider } from '@/types/chat';
import { decrypt } from '@/lib/crypto';

type Sb = SupabaseClient<Database>;

/**
 * Resolve the API key for a given provider and user.
 *
 * 1. Check the `chat_api_keys` table for an encrypted key.
 * 2. If not found, check if the user is an admin — admins fall back to env vars.
 * 3. Otherwise throw.
 */
export async function resolveApiKey(
  sb: Sb,
  clerkUserId: string,
  provider: AIProvider,
): Promise<string> {
  // 1. Check user's stored key
  const { data: storedKey } = await sb
    .from('chat_api_keys')
    .select('encrypted_key, iv, auth_tag')
    .eq('clerk_user_id', clerkUserId)
    .eq('provider', provider)
    .single();

  if (storedKey) {
    return decrypt({
      encryptedKey: storedKey.encrypted_key,
      iv: storedKey.iv,
      authTag: storedKey.auth_tag,
    });
  }

  // 2. Check if admin — admins can use server env vars
  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', clerkUserId)
    .single();

  if (profile?.is_admin) {
    const envKey = getEnvKey(provider);
    if (envKey) return envKey;
  }

  throw new Error(
    `No API key configured for ${provider}. Please add your API key in settings.`,
  );
}

function getEnvKey(provider: AIProvider): string | undefined {
  switch (provider) {
    case 'openai': return process.env.OPENAI_API_KEY;
    case 'google': return process.env.GOOGLE_AI_API_KEY;
    case 'anthropic': return process.env.ANTHROPIC_API_KEY;
    default: return undefined;
  }
}
