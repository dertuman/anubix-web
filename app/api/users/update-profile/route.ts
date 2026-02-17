import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
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
      .eq('id', userId)
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
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
