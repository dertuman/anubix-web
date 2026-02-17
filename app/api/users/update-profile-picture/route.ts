import { File } from 'buffer';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { randomUppercaseString } from '@/lib/utils';

const BUCKET = 'profile-pictures';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('profilePicture');
    const currentProfilePicture = form.get('currentProfilePicture') as string;

    const isFile = file instanceof File;
    const isDelete = typeof file === 'string';

    if (!isFile && !isDelete)
      return NextResponse.json({ message: 'Please provide a file' });

    const storage = createSupabaseAdmin();

    if (!storage) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    let path;
    if (isFile) {
      const buffer = await file.arrayBuffer();
      const key = randomUppercaseString() + '_' + file.name;

      const { error: uploadError } = await storage.storage
        .from(BUCKET)
        .upload(key, Buffer.from(buffer), {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: urlData } = storage.storage
        .from(BUCKET)
        .getPublicUrl(key);

      path = urlData.publicUrl;
    }

    const supabase = await createClerkSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        profile_picture: path
          ? path
          : 'https://placehold.co/600x400/png?text=Hello+World',
      })
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete old profile picture from storage
    if (
      currentProfilePicture &&
      currentProfilePicture.length > 0 &&
      currentProfilePicture !==
        'https://placehold.co/600x400/png?text=Hello+World' &&
      currentProfilePicture.includes(BUCKET)
    ) {
      const oldKey = currentProfilePicture.split(`${BUCKET}/`).pop();
      if (oldKey) {
        await storage.storage.from(BUCKET).remove([oldKey]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully uploaded file and set key in db',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to upload file',
      },
      { status: 500 }
    );
  }
}
