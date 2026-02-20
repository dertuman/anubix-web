import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

const SUPPORTED_FORMATS = [
  'audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/opus',
  'audio/mpeg', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/amr',
];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 });
    }

    const isSupported = SUPPORTED_FORMATS.some((f) =>
      audioFile.type.toLowerCase().startsWith(f.split(';')[0])
    );
    if (!isSupported) {
      return NextResponse.json({ error: `Unsupported format: ${audioFile.type}` }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      temperature: 0.1,
      response_format: 'json',
    });

    const transcription = result.text?.trim();
    if (!transcription) {
      return NextResponse.json(
        { error: 'Could not transcribe. Please speak clearly and try again.', transcription: '' },
        { status: 422 }
      );
    }

    return NextResponse.json({ transcription, success: true });
  } catch (error: unknown) {
    console.error('Transcription error:', error);

    if (error instanceof OpenAI.AuthenticationError) {
      return NextResponse.json(
        { error: 'Transcription service is not configured correctly. Please contact the administrator.' },
        { status: 503 }
      );
    }

    if (error instanceof OpenAI.RateLimitError) {
      const message = error.message?.toLowerCase() ?? '';
      if (message.includes('quota') || message.includes('billing') || message.includes('exceeded')) {
        return NextResponse.json(
          { error: 'Transcription quota exceeded. The API credits may have run out.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Too many transcription requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Transcription failed. Please try again.' },
      { status: 500 }
    );
  }
}
