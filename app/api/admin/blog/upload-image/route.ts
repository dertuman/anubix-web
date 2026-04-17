import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

import { requireAdmin } from '@/lib/admin-gate';
import { ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN } from '@/lib/constants';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (!ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const folder = (formData.get('folder') as string | null) ?? 'blog';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 400 });
  }

  const ext = file.type.split('/')[1] ?? 'png';
  const filename = `${folder}/${Date.now()}-${sanitize(file.name)}.${ext}`;

  const uploaded = await put(filename, file, {
    access: 'public',
    contentType: file.type,
    token: ANUBIX_WEB_ASSETS_BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: uploaded.url });
}

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'image';
}
