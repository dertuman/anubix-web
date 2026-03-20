'use client';

import { memo, useCallback, useMemo, useRef } from 'react';
import { FileCode2, Minus, Plus } from 'lucide-react';
import * as Diff from 'diff';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import type { FileChange, FileEdit } from './changes-utils';

// ── Diff computation ────────────────────────────────────────

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  text: string;
  oldLineNo?: number;
  newLineNo?: number;
}

function computeEditDiff(edit: FileEdit): DiffLine[] {
  const { oldStr, newStr } = edit;

  // New file — everything is additions
  if (!oldStr) {
    return newStr.split('\n').map((text, i) => ({
      type: 'add' as const,
      text,
      newLineNo: i + 1,
    }));
  }

  // Use Myers diff for proper unified output
  const changes = Diff.diffLines(oldStr, newStr);
  const lines: DiffLine[] = [];
  let oldNo = 1;
  let newNo = 1;

  for (const part of changes) {
    const partLines = part.value.replace(/\n$/, '').split('\n');

    for (const text of partLines) {
      if (part.added) {
        lines.push({ type: 'add', text, newLineNo: newNo++ });
      } else if (part.removed) {
        lines.push({ type: 'remove', text, oldLineNo: oldNo++ });
      } else {
        lines.push({ type: 'context', text, oldLineNo: oldNo++, newLineNo: newNo++ });
      }
    }
  }

  return lines;
}

// ── File section ────────────────────────────────────────────

interface FileSectionProps {
  file: FileChange;
}

const FileSection = memo(function FileSection({ file }: FileSectionProps) {
  const allLines = useMemo(() => {
    const result: { editIndex: number; lines: DiffLine[] }[] = [];
    for (let i = 0; i < file.edits.length; i++) {
      result.push({ editIndex: i, lines: computeEditDiff(file.edits[i]) });
    }
    return result;
  }, [file.edits]);

  return (
    <div className="overflow-hidden rounded-lg border border-border/40">
      {/* Sticky file header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/30 bg-muted/80 px-3 py-2 backdrop-blur-sm">
        <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{file.fileName}</span>
        <div className="flex items-center gap-1.5">
          {file.additions > 0 && (
            <Badge
              variant="outline"
              className="h-5 gap-0.5 border-custom-green/50 bg-custom-green/15 px-1.5 text-[10px] font-semibold text-custom-green"
            >
              <Plus className="size-2.5" />
              {file.additions}
            </Badge>
          )}
          {file.deletions > 0 && (
            <Badge
              variant="outline"
              className="h-5 gap-0.5 border-destructive/50 bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive"
            >
              <Minus className="size-2.5" />
              {file.deletions}
            </Badge>
          )}
        </div>
      </div>
      {file.isNewFile && (
        <div className="border-b border-border/20 bg-custom-green/5 px-3 py-1">
          <span className="text-[10px] font-medium text-custom-green">New file</span>
        </div>
      )}

      {/* Diff hunks */}
      {allLines.map(({ editIndex, lines }) => (
        <div key={editIndex}>
          {file.edits.length > 1 && editIndex > 0 && (
            <div className="border-t border-dashed border-border/30 bg-muted/20 px-3 py-1">
              <span className="text-[10px] text-muted-foreground/60">
                edit {editIndex + 1} of {file.edits.length}
              </span>
            </div>
          )}
          <table className="w-full border-collapse font-mono text-xs">
            <tbody>
              {lines.map((line, i) => (
                <tr
                  key={`${editIndex}-${i}`}
                  className={cn(
                    'group',
                    line.type === 'add' && 'bg-custom-green/8 text-custom-green',
                    line.type === 'remove' && 'bg-destructive/8 text-destructive',
                    line.type === 'context' && 'text-foreground/70',
                  )}
                >
                  <td className="w-[1%] select-none whitespace-nowrap border-r border-border/20 px-2 py-0.5 text-right text-[10px] text-muted-foreground/50">
                    {line.oldLineNo ?? ''}
                  </td>
                  <td className="w-[1%] select-none whitespace-nowrap border-r border-border/20 px-2 py-0.5 text-right text-[10px] text-muted-foreground/50">
                    {line.newLineNo ?? ''}
                  </td>
                  <td className="w-[1%] select-none whitespace-nowrap px-1 py-0.5 text-center">
                    {line.type === 'add' && '+'}
                    {line.type === 'remove' && '-'}
                    {line.type === 'context' && ' '}
                  </td>
                  <td className="whitespace-pre-wrap break-all py-0.5 pr-3">
                    {line.text || '\u00A0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
});

// ── Main panel ──────────────────────────────────────────────

interface ChangesPanelProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  fileChanges: FileChange[];
}

export const ChangesPanel = memo(function ChangesPanel({
  open,
  onOpenChange,
  fileChanges,
}: ChangesPanelProps) {
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const totals = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const f of fileChanges) {
      additions += f.additions;
      deletions += f.deletions;
    }
    return { additions, deletions };
  }, [fileChanges]);

  const scrollToFile = useCallback((filePath: string) => {
    const el = fileRefs.current.get(filePath);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const setFileRef = useCallback((filePath: string, el: HTMLDivElement | null) => {
    if (el) fileRefs.current.set(filePath, el);
    else fileRefs.current.delete(filePath);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[min(90vw,720px)]"
      >
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-sm font-semibold">Changes</SheetTitle>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium text-muted-foreground">
              {fileChanges.length} {fileChanges.length === 1 ? 'file' : 'files'}
            </Badge>
            <div className="flex items-center gap-1.5">
              {totals.additions > 0 && (
                <Badge
                  variant="outline"
                  className="h-5 gap-0.5 border-custom-green/50 bg-custom-green/15 px-1.5 text-[10px] font-semibold text-custom-green"
                >
                  <Plus className="size-2.5" />
                  {totals.additions}
                </Badge>
              )}
              {totals.deletions > 0 && (
                <Badge
                  variant="outline"
                  className="h-5 gap-0.5 border-destructive/50 bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive"
                >
                  <Minus className="size-2.5" />
                  {totals.deletions}
                </Badge>
              )}
            </div>
          </div>
          <SheetDescription className="sr-only">
            All file changes in this session
          </SheetDescription>
        </SheetHeader>

        {/* Body: file list + diffs */}
        <div className="flex min-h-0 flex-1">
          {/* File list sidebar — hidden on small screens */}
          <div className="hidden w-44 shrink-0 border-r border-border/20 md:block">
            <ScrollArea className="h-full">
              <div className="space-y-0.5 p-2">
                {fileChanges.map((f) => (
                  <button
                    key={f.filePath}
                    onClick={() => scrollToFile(f.filePath)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={f.filePath}
                  >
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        f.isNewFile ? 'bg-custom-green' : 'bg-amber-500',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
                    <span className="shrink-0 text-[9px] text-custom-green">+{f.additions}</span>
                    {f.deletions > 0 && (
                      <span className="shrink-0 text-[9px] text-destructive">-{f.deletions}</span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Diff content area */}
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              {fileChanges.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                  <FileCode2 className="size-8 opacity-30" />
                  <p className="text-sm">No file changes in this session</p>
                </div>
              ) : (
                <>
                  {/* Mobile file list */}
                  <div className="flex flex-wrap gap-1.5 md:hidden">
                    {fileChanges.map((f) => (
                      <button
                        key={f.filePath}
                        onClick={() => scrollToFile(f.filePath)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            f.isNewFile ? 'bg-custom-green' : 'bg-amber-500',
                          )}
                        />
                        {f.fileName}
                      </button>
                    ))}
                  </div>

                  {/* File diffs */}
                  {fileChanges.map((f) => (
                    <div key={f.filePath} ref={(el) => setFileRef(f.filePath, el)}>
                      <p className="mb-1.5 truncate text-[10px] text-muted-foreground/60" title={f.filePath}>
                        {f.filePath}
                      </p>
                      <FileSection file={f} />
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
});
