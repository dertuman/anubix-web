'use client';

import { useMemo } from 'react';
import type { FileAttachment } from '@/types/code';
import { formatFileSize } from '@/lib/file-utils';
import { getCategoryIcon } from '@/lib/ui-utils';
import { MessageActions } from './message-actions';

export interface UserMessageProps {
  text: string;
  images?: string[];
  files?: FileAttachment[];
}

export function UserMessage({ text, images, files }: UserMessageProps) {
  const nonImageFiles = useMemo(() => (files ?? []).filter((f) => f.category !== 'image'), [files]);

  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-2">
        {nonImageFiles.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {nonImageFiles.map((f) => {
              const Icon = getCategoryIcon(f.category);
              return (
                <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/50 px-2.5 py-1.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="max-w-[160px] truncate text-xs font-medium">{f.name}</span>
                    {f.size > 0 && <span className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {text && (
          <div className="flex items-start gap-1.5 self-end overflow-hidden rounded-xl rounded-br-none bg-user-bubble text-user-bubble-foreground ring-1 ring-user-bubble-ring px-4 py-2.5">
            <p className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
            <MessageActions text={text} />
          </div>
        )}
        {images && images.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {images.map((img, i) => <img key={i} src={img} alt="" className="max-h-48 max-w-[300px] rounded-xl object-cover" />)}
          </div>
        )}
      </div>
    </div>
  );
}
