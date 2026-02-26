import type { FileAttachment } from '@/types/code';

export interface ProcessedAttachments {
  textPrefix: string;
  transcriptions: string;
  pdfText: string;
  images: Array<{ base64: string; mimeType: string }>;
  imageDataUrls: string[];
}

export async function processAttachments(files: FileAttachment[]): Promise<ProcessedAttachments> {
  const result: ProcessedAttachments = {
    textPrefix: '',
    transcriptions: '',
    pdfText: '',
    images: [],
    imageDataUrls: [],
  };

  // Inject code/text files as fenced blocks
  const textFiles = files.filter((f) => f.category === 'text' && f.textContent);
  if (textFiles.length) {
    result.textPrefix = textFiles.map((f) => {
      const ext = f.name.split('.').pop() || '';
      return `\`\`\`${ext} (${f.name})\n${f.textContent}\n\`\`\``;
    }).join('\n\n');
  }

  // Transcribe audio/video
  const audioFiles = files.filter((f) => (f.category === 'audio' || f.category === 'video') && f.data);
  if (audioFiles.length) {
    const transcriptions = await Promise.all(audioFiles.map(async (f) => {
      try {
        const blob = await (await fetch(f.data!)).blob();
        const fd = new FormData();
        fd.append('audio', blob, f.name);
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
        if (!res.ok) return null;
        const { transcription } = await res.json();
        return transcription ? `[Transcription of ${f.name}]:\n${transcription}` : null;
      } catch (err) {
        console.error(`Failed to transcribe ${f.name}:`, err);
        return null;
      }
    }));
    result.transcriptions = transcriptions.filter(Boolean).join('\n\n');
  }

  // Extract PDF text
  const pdfFiles = files.filter((f) => f.category === 'pdf' && f.data);
  if (pdfFiles.length) {
    const pdfTexts = await Promise.all(pdfFiles.map(async (f) => {
      try {
        const blob = await (await fetch(f.data!)).blob();
        const fd = new FormData();
        fd.append('file', blob, f.name);
        const res = await fetch('/api/extract-pdf', { method: 'POST', body: fd });
        if (!res.ok) return null;
        const { text, pages } = await res.json();
        return text ? `[Content of ${f.name} (${pages} page${pages !== 1 ? 's' : ''})]:\n${text}` : null;
      } catch (err) {
        console.error(`Failed to extract PDF ${f.name}:`, err);
        return null;
      }
    }));
    result.pdfText = pdfTexts.filter(Boolean).join('\n\n');
  }

  // Extract images for bridge
  const imageFiles = files.filter((f) => f.category === 'image' && f.data);
  result.images = imageFiles.map((f) => ({
    base64: f.data!.includes(',') ? f.data!.split(',')[1] : f.data!,
    mimeType: f.mimeType,
  }));
  result.imageDataUrls = imageFiles.map((f) => f.data!);

  return result;
}
