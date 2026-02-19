/**
 * Shared UI utilities used across chat and code components.
 */
import {
  FileAudio,
  FileCode,
  FileIcon,
  FileText,
  FileVideo,
} from 'lucide-react';

/**
 * Returns the appropriate Lucide icon component for a file category.
 */
export function getCategoryIcon(category: string) {
  switch (category) {
    case 'audio': return FileAudio;
    case 'video': return FileVideo;
    case 'text': return FileCode;
    case 'pdf': return FileText;
    default: return FileIcon;
  }
}
