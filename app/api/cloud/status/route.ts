import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

/**
 * GET /api/cloud/status
 *
 * Returns the current cloud machine state for the authenticated user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const supabase = await createClerkSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('cloud_machines')
    .select()
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ machine: null });
  }

  return NextResponse.json({
    machine: {
      status: data.status,
      bridgeUrl: data.bridge_url,
      bridgeApiKey: data.bridge_api_key_encrypted
        ? decrypt(data.bridge_api_key_encrypted)
        : null,
      previewUrl: data.bridge_url ? `${data.bridge_url}/preview/` : null,
      region: data.fly_region,
      claudeMode: data.claude_mode,
      templateName: data.template_name,
      gitRepoUrl: data.git_repo_url,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      stoppedAt: data.stopped_at,
      lastHealthCheckAt: data.last_health_check_at,
    },
  });
}
