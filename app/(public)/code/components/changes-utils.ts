import type { CodeMessage } from '@/types/code';

// ── Types ────────────────────────────────────────────────────

export interface FileEdit {
  oldStr: string;
  newStr: string;
}

export interface FileChange {
  filePath: string;
  fileName: string;
  edits: FileEdit[];
  isNewFile: boolean;
  additions: number;
  deletions: number;
}

// ── Extraction logic ─────────────────────────────────────────

/**
 * Walk all messages in a session and aggregate file changes
 * grouped by file path, preserving order of first appearance.
 */
export function extractFileChanges(messages: CodeMessage[]): FileChange[] {
  const map = new Map<string, { edits: FileEdit[]; isNewFile: boolean }>();
  const order: string[] = [];

  for (const msg of messages) {
    if (msg.type !== 'tool_use' || !msg.isComplete || !msg.toolInput) continue;

    const name = msg.toolName.toLowerCase();
    const filePath = msg.toolInput.file_path as string | undefined;
    if (!filePath) continue;

    if (name === 'edit') {
      const oldStr = (msg.toolInput.old_string as string) ?? '';
      const newStr = (msg.toolInput.new_string as string) ?? '';
      if (!oldStr && !newStr) continue;

      if (!map.has(filePath)) {
        map.set(filePath, { edits: [], isNewFile: false });
        order.push(filePath);
      }
      map.get(filePath)!.edits.push({ oldStr, newStr });
    } else if (name === 'write') {
      const content = (msg.toolInput.content as string) ?? (msg.toolInput.new_string as string) ?? '';
      if (!content) continue;

      if (!map.has(filePath)) {
        map.set(filePath, { edits: [], isNewFile: true });
        order.push(filePath);
      }
      const entry = map.get(filePath)!;
      // Write replaces the entire file — treat as single new-file edit
      entry.edits.push({ oldStr: '', newStr: content });
      entry.isNewFile = true;
    }
  }

  return order.map((filePath) => {
    const entry = map.get(filePath)!;
    let additions = 0;
    let deletions = 0;

    for (const edit of entry.edits) {
      const oldLines = edit.oldStr ? edit.oldStr.split('\n').length : 0;
      const newLines = edit.newStr ? edit.newStr.split('\n').length : 0;
      additions += newLines;
      deletions += oldLines;
    }

    return {
      filePath,
      fileName: filePath.split('/').pop() ?? filePath,
      edits: entry.edits,
      isNewFile: entry.isNewFile,
      additions,
      deletions,
    };
  });
}
