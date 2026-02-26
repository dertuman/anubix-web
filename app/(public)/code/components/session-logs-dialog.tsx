'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import type { BridgeLogs } from '@/hooks/useClaudeCode';
import { Button } from '@/components/ui/button';

export interface SessionLogsDialogProps {
  onFetchLogs: (_opts?: { last?: number; filter?: string }) => Promise<BridgeLogs>;
}

export function SessionLogsDialog({ onFetchLogs }: SessionLogsDialogProps) {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  return (
    <div className="space-y-1.5">
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          setLogsLoading(true);
          try {
            const data = await onFetchLogs({ last: 100 });
            setLogLines(data.lines);
          } catch (err) {
            console.error('Failed to fetch logs:', err);
            setLogLines([`Error: ${err instanceof Error ? err.message : 'Failed to fetch logs'}`]);
          } finally {
            setLogsLoading(false);
          }
        }}
        disabled={logsLoading}
        className="w-full gap-1 text-[10px]"
      >
        {logsLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        {logsLoading ? 'Loading...' : 'Fetch Logs'}
      </Button>
      {logLines.length > 0 && (
        <div className="max-h-40 overflow-auto rounded border border-border/20 bg-black/80 p-1.5 font-mono text-[9px] leading-tight text-green-400">
          {logLines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
