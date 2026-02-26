'use client';

import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';

import type { ExecResult } from '@/hooks/useClaudeCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface SessionExecDialogProps {
  onExecCommand: (_command: string) => Promise<ExecResult>;
}

export function SessionExecDialog({ onExecCommand }: SessionExecDialogProps) {
  const [terminalCmd, setTerminalCmd] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalRunning, setTerminalRunning] = useState(false);

  const runCommand = async () => {
    if (!terminalCmd.trim() || terminalRunning) return;
    setTerminalRunning(true);
    setTerminalOutput('');
    try {
      const res = await onExecCommand(terminalCmd);
      let output = '';
      if (res.stdout) output += res.stdout;
      if (res.stderr) output += (output ? '\n' : '') + res.stderr;
      if (res.error) output += (output ? '\n' : '') + `Error: ${res.error}`;
      output += `\n[exit code: ${res.exitCode}]`;
      setTerminalOutput(output);
    } catch (err) {
      console.error('Command execution failed:', err);
      setTerminalOutput(`Error: ${err instanceof Error ? err.message : 'Command failed'}`);
    } finally {
      setTerminalRunning(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <Input
          value={terminalCmd}
          onChange={(e) => setTerminalCmd(e.target.value)}
          placeholder="ls -la /root/.claude/"
          className="h-7 flex-1 font-mono text-[10px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runCommand();
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={terminalRunning || !terminalCmd.trim()}
          onClick={runCommand}
          className="h-7 px-2"
        >
          {terminalRunning ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
        </Button>
      </div>
      {terminalOutput && (
        <div className="max-h-40 overflow-auto rounded border border-border/20 bg-black/80 p-1.5 font-mono text-[9px] leading-tight text-green-400">
          <pre className="whitespace-pre-wrap break-all">{terminalOutput}</pre>
        </div>
      )}
    </div>
  );
}
