import { NextResponse } from 'next/server';

import { getAuthEmail } from '@/lib/auth-utils';
import { createSupabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const email = await getAuthEmail();

  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('language')
      .eq('email', email)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'User language retrieved successfully',
      success: true,
      language: data.language,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
