import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

import { ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN } from '@/lib/constants';

export const revalidate = 3600;

export async function GET() {
  try {
    const { blobs } = await list({
      token: ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN,
    });

    const imageExtensions = /\.(png|jpg|jpeg|webp)$/i;

    const screenshots = blobs
      .filter(
        (blob) =>
          imageExtensions.test(blob.pathname) &&
          !blob.pathname.startsWith('logo')
      )
      .sort((a, b) => a.pathname.localeCompare(b.pathname))
      .map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
      }));

    return NextResponse.json({ screenshots });
  } catch {
    return NextResponse.json({ screenshots: [] });
  }
}
