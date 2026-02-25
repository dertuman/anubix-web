import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmail } from '@/lib/auth-utils';

import { createClerkSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const email = await getAuthEmail();

  if (!email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const updateOperation: Record<string, string> = {};

    // Profile fields stored in Supabase
    if (formData.get('bio')) updateOperation.bio = formData.get('bio') as string;
    if (formData.get('dob')) updateOperation.dob = formData.get('dob') as string;
    if (formData.get('profilePicture'))
      updateOperation.profile_picture = formData.get('profilePicture') as string;
    if (formData.get('font')) updateOperation.font = formData.get('font') as string;
    if (formData.get('theme'))
      updateOperation.theme = formData.get('theme') as string;
    if (formData.get('language'))
      updateOperation.language = formData.get('language') as string;

    const supabase = await createClerkSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateOperation)
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      success: true,
      user: data,
    });
  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
