import { useCallback, useRef, useState } from 'react';

import type { FileAttachment } from '@/types/code';
import { MAX_FILE_SIZE, compressImageForUpload, readFileAsAttachment, formatFileSize, getFileCategory } from '@/lib/file-utils';
import { toast } from '@/components/ui/use-toast';

/**
 * Manages file attachment state, drag-and-drop, and file reading.
 */
export function useFileAttachments() {
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const addFiles = useCallback(async (rawFiles: File[]) => {
    for (const file of rawFiles) {
      let processedFile = file;

      if (getFileCategory(file) === 'image') {
        try {
          processedFile = await compressImageForUpload(file);
        } catch {
          // Compression failed — proceed with original; size check below will catch truly huge files
          processedFile = file;
        }
      }

      if (processedFile.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `"${file.name}" exceeds the ${formatFileSize(MAX_FILE_SIZE)} limit.`,
          variant: 'destructive',
        });
        continue;
      }
      try {
        const attachment = await readFileAsAttachment(processedFile);
        setAttachedFiles((prev) => [...prev, attachment]);
      } catch {
        toast({
          title: 'Failed to read file',
          description: `Could not read "${file.name}".`,
          variant: 'destructive',
        });
      }
    }
  }, []);

  const removeFile = useCallback(
    (id: string) => setAttachedFiles((prev) => prev.filter((f) => f.id !== id)),
    [],
  );

  const clearFiles = useCallback(() => setAttachedFiles([]), []);

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) addFiles(droppedFiles);
    },
    [addFiles],
  );

  return {
    attachedFiles,
    isDragging,
    addFiles,
    removeFile,
    clearFiles,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
