import { NextRequest, NextResponse } from 'next/server';

import { getAuthEmail } from '@/lib/auth-utils';
import { createSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const email = await getAuthEmail();

  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const { locale } = await req.json();

    const supabase = createSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ language: locale })
      .eq('email', email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Locale updated successfully',
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
