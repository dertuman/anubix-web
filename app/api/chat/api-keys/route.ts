import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { encrypt, decrypt } from '@/lib/crypto';
import { createClerkSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/chat/api-keys — List providers the user has keys for.
 *
 * Query params:
 *   ?include=keys — Also return decrypted plaintext keys (for native app sync).
 *                    Keys are returned over HTTPS to an authenticated user.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const includeKeys = req.nextUrl.searchParams.get('include') === 'keys';

  try {
    // Always fetch all encrypted columns — the typed Supabase client doesn't
    // support dynamic column strings, and we need them anyway when include=keys.
    const { data, error } = await sb
      .from('chat_api_keys')
      .select('provider, encrypted_key, iv, auth_tag')
      .eq('clerk_user_id', userId);

    if (error) {
      console.error('[chat/api-keys GET] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch API keys.' }, { status: 500 });
    }

    const providers = (data ?? []).map((r) => r.provider);

    // Decrypt keys if requested
    let keys: Record<string, string> | undefined;
    if (includeKeys && data) {
      keys = {};
      for (const row of data) {
        try {
          keys[row.provider] = decrypt({
            encryptedKey: row.encrypted_key,
            iv: row.iv,
            authTag: row.auth_tag,
          });
        } catch (decryptErr) {
          console.error(`[chat/api-keys GET] Failed to decrypt key for ${row.provider}:`, (decryptErr as Error).message);
          // Skip keys that fail to decrypt rather than failing the whole request
        }
      }
    }

    // Admin fallback
    const { data: profile } = await sb
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profile?.is_admin) {
      if (process.env.OPENAI_API_KEY && !providers.includes('openai')) providers.push('openai');
      if (process.env.GOOGLE_AI_API_KEY && !providers.includes('google')) providers.push('google');
      if (process.env.ANTHROPIC_API_KEY && !providers.includes('anthropic')) providers.push('anthropic');
    }

    return NextResponse.json({ success: true, providers, ...(keys !== undefined && { keys }) });
  } catch (error) {
    console.error('[chat/api-keys GET] Error:', (error as Error).message);
    return NextResponse.json({ error: 'Failed to fetch API keys.' }, { status: 500 });
  }
}

/**
 * POST /api/chat/api-keys — Save an encrypted API key.
 * Body: { provider: 'openai' | 'google' | 'anthropic', key: string }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const { provider, key } = await req.json();

    if (!provider || !key) {
      return NextResponse.json({ error: 'Missing provider or key' }, { status: 400 });
    }

    if (!['openai', 'google', 'anthropic'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const { encryptedKey, iv, authTag } = encrypt(key);

    const { error } = await sb
      .from('chat_api_keys')
      .upsert(
        {
          clerk_user_id: userId,
          provider,
          encrypted_key: encryptedKey,
          iv,
          auth_tag: authTag,
        },
        { onConflict: 'clerk_user_id,provider' },
      );

    if (error) {
      console.error('[chat/api-keys POST] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to save API key.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[chat/api-keys POST] Error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/api-keys — Remove an API key.
 * Body: { provider: 'openai' | 'google' | 'anthropic' }
 */
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClerkSupabaseClient();
  if (!sb) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
    }

    const { error } = await sb
      .from('chat_api_keys')
      .delete()
      .eq('clerk_user_id', userId)
      .eq('provider', provider);

    if (error) {
      console.error('[chat/api-keys DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to remove API key.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[chat/api-keys DELETE] Error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
