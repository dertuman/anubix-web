import imageCompression from 'browser-image-compression';

import type { FileAttachment, FileCategory } from '@/types/code';

export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

/**
 * Compresses an image File for AI analysis.
 * Targets ~1 MB / 1920 px max — good quality for vision models, fast to upload,
 * and stays manageable when sending 5-10 images in a single message.
 * Returns the original file unchanged if it is already small enough.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  const TARGET_MB = 1;
  if (file.size <= TARGET_MB * 1024 * 1024) return file;

  return imageCompression(file, {
    maxSizeMB: TARGET_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
  });
}

const TEXT_EXTENSIONS: Record<string, string> = {
  '.txt': 'Text', '.md': 'Markdown', '.csv': 'CSV', '.json': 'JSON',
  '.xml': 'XML', '.yaml': 'YAML', '.yml': 'YAML', '.py': 'Python',
  '.js': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'TSX', '.jsx': 'JSX',
  '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.c': 'C', '.cpp': 'C++',
  '.cs': 'C#', '.php': 'PHP', '.rb': 'Ruby', '.sql': 'SQL', '.sh': 'Shell',
  '.html': 'HTML', '.css': 'CSS', '.svg': 'SVG', '.log': 'Log',
  '.toml': 'TOML', '.ini': 'INI', '.env': 'Env',
};

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.ogg', '.opus', '.m4a', '.aac', '.flac', '.wma', '.webm',
  '.amr', '.aiff', '.oga', '.spx', '.ptt',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp',
]);

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.avif', '.tiff',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  '.ogg': 'audio/ogg', '.opus': 'audio/opus', '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.flac': 'audio/flac', '.wma': 'audio/x-ms-wma', '.webm': 'audio/webm',
  '.amr': 'audio/amr', '.ptt': 'audio/ogg', '.mp4': 'video/mp4',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska', '.pdf': 'application/pdf',
};

function getExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function getFileCategory(file: File): FileCategory {
  const ext = getExtension(file.name);
  if (ext in TEXT_EXTENSIONS) return 'text';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (ext === '.pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'application/ogg') return 'audio';
  if (file.type.startsWith('text/')) return 'text';
  return 'text';
}

function resolveMimeType(file: File): string {
  const ext = getExtension(file.name);
  if (!file.type || file.type === 'application/octet-stream' || file.type === 'application/ogg') {
    return MIME_BY_EXTENSION[ext] || file.type || 'application/octet-stream';
  }
  return file.type;
}

export function readFileAsAttachment(file: File): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    const category = getFileCategory(file);
    const mimeType = resolveMimeType(file);
    const base: Omit<FileAttachment, 'data' | 'textContent'> = {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType,
      size: file.size,
      category,
    };

    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);

    if (category === 'text') {
      reader.onload = () => resolve({ ...base, textContent: reader.result as string });
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        let dataUrl = reader.result as string;
        const colonIdx = dataUrl.indexOf(':');
        const semiIdx = dataUrl.indexOf(';');
        if (colonIdx >= 0 && semiIdx > colonIdx) {
          dataUrl = `data:${mimeType}${dataUrl.slice(semiIdx)}`;
        }
        resolve({ ...base, data: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
