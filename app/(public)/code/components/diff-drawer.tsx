'use client';

import { useMemo } from 'react';
import { FileCode2, Minus, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

// ── Diff computation ────────────────────────────────────────

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  text: string;
  oldLineNo?: number;
  newLineNo?: number;
}

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr ? oldStr.split('\n') : [];
  const newLines = newStr ? newStr.split('\n') : [];
  const lines: DiffLine[] = [];

  // If old is empty, everything is an addition
  if (oldLines.length === 0 || (oldLines.length === 1 && oldLines[0] === '')) {
    let newNo = 1;
    for (const line of newLines) {
      lines.push({ type: 'add', text: line, newLineNo: newNo++ });
    }
    return lines;
  }

  // If new is empty, everything is a deletion
  if (newLines.length === 0 || (newLines.length === 1 && newLines[0] === '')) {
    let oldNo = 1;
    for (const line of oldLines) {
      lines.push({ type: 'remove', text: line, oldLineNo: oldNo++ });
    }
    return lines;
  }

  // Standard replacement diff: show old lines as deletions, new lines as additions
  let oldNo = 1;
  for (const line of oldLines) {
    lines.push({ type: 'remove', text: line, oldLineNo: oldNo++ });
  }
  let newNo = 1;
  for (const line of newLines) {
    lines.push({ type: 'add', text: line, newLineNo: newNo++ });
  }

  return lines;
}

// ── Component ───────────────────────────────────────────────

interface DiffDrawerProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  filePath: string;
  oldString: string;
  newString: string;
}

export function DiffDrawer({
  open,
  onOpenChange,
  filePath,
  oldString,
  newString,
}: DiffDrawerProps) {
  const fileName = filePath.split('/').pop() ?? filePath;

  const diffLines = useMemo(
    () => computeDiff(oldString, newString),
    [oldString, newString],
  );

  const additions = diffLines.filter((l) => l.type === 'add').length;
  const deletions = diffLines.filter((l) => l.type === 'remove').length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="gap-2 pb-2">
          <div className="flex items-center gap-2">
            <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
            <DrawerTitle className="truncate text-sm font-semibold">
              {fileName}
            </DrawerTitle>
            <div className="flex items-center gap-1.5">
              {additions > 0 && (
                <Badge
                  variant="outline"
                  className="h-5 gap-0.5 border-custom-green/50 bg-custom-green/15 px-1.5 text-[10px] font-semibold text-custom-green"
                >
                  <Plus className="size-2.5" />
                  {additions}
                </Badge>
              )}
              {deletions > 0 && (
                <Badge
                  variant="outline"
                  className="h-5 gap-0.5 border-destructive/50 bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive"
                >
                  <Minus className="size-2.5" />
                  {deletions}
                </Badge>
              )}
            </div>
          </div>
          <DrawerDescription className="truncate text-xs text-muted-foreground/70">
            {filePath}
          </DrawerDescription>
        </DrawerHeader>

        {/* Diff body */}
        <div className="custom-scrollbar flex-1 overflow-auto px-2 pb-6">
          <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/30">
            <table className="w-full border-collapse font-mono text-xs">
              <tbody>
                {diffLines.map((line, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'group',
                      line.type === 'add' &&
                        'bg-custom-green/8 text-custom-green',
                      line.type === 'remove' &&
                        'bg-destructive/8 text-destructive',
                      line.type === 'context' && 'text-foreground/70',
                    )}
                  >
                    {/* Old line number */}
                    <td className="w-[1%] select-none whitespace-nowrap border-r border-border/20 px-2 py-0.5 text-right text-[10px] text-muted-foreground/50">
                      {line.oldLineNo ?? ''}
                    </td>
                    {/* New line number */}
                    <td className="w-[1%] select-none whitespace-nowrap border-r border-border/20 px-2 py-0.5 text-right text-[10px] text-muted-foreground/50">
                      {line.newLineNo ?? ''}
                    </td>
                    {/* Prefix */}
                    <td className="w-[1%] select-none whitespace-nowrap px-1 py-0.5 text-center">
                      {line.type === 'add' && '+'}
                      {line.type === 'remove' && '-'}
                      {line.type === 'context' && ' '}
                    </td>
                    {/* Content */}
                    <td className="whitespace-pre-wrap break-all py-0.5 pr-3">
                      {line.text || '\u00A0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
