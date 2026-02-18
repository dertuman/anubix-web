import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PDFParse } from 'pdf-parse';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  let parser: PDFParse | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF too large (max 25MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const result = await parser.getText();

    const text = result.text?.trim();
    const pages = result.total ?? 0;

    if (!text) {
      return NextResponse.json(
        { error: 'Could not extract text. May be a scanned/image-only PDF.', text: '' },
        { status: 422 },
      );
    }

    return NextResponse.json({ text, pages, success: true });
  } catch (error: unknown) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF.' },
      { status: 500 },
    );
  } finally {
    await parser?.destroy();
  }
}
