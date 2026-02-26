'use client';

import { useState } from 'react';
import { Eye, EyeOff, Key, Loader2 } from 'lucide-react';

import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface SessionCredsDialogProps {
  onPushCredentials: (_opts: { claudeMode: 'cli' | 'sdk'; claudeAuthJson?: string; anthropicApiKey?: string }) => Promise<void>;
}

export function SessionCredsDialog({ onPushCredentials }: SessionCredsDialogProps) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground">
        Enter an Anthropic API key to switch to API mode. This bypasses CLI/OAuth auth.
      </p>
      <div className="relative">
        <Input
          type={showApiKeyValue ? 'text' : 'password'}
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="sk-ant-..."
          className="h-7 pr-8 font-mono text-[10px]"
        />
        <button
          type="button"
          onClick={() => setShowApiKeyValue(!showApiKeyValue)}
          className="absolute right-0 top-0 flex h-7 items-center px-2 text-muted-foreground hover:text-foreground"
        >
          {showApiKeyValue ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          if (!apiKeyInput.trim()) return;
          setApiKeySaving(true);
          try {
            await onPushCredentials({ claudeMode: 'sdk', anthropicApiKey: apiKeyInput.trim() });
            toast({ title: 'API key set', description: 'Switched to API mode. Existing conversations were reset.' });
            setApiKeyInput('');
          } catch (err) {
            console.error('Failed to set API key:', err);
            toast({ title: 'Failed', description: err instanceof Error ? err.message : 'Failed to set API key', variant: 'destructive' });
          } finally {
            setApiKeySaving(false);
          }
        }}
        disabled={apiKeySaving || !apiKeyInput.trim()}
        className="w-full gap-1 text-[10px]"
      >
        {apiKeySaving ? <Loader2 className="size-3 animate-spin" /> : <Key className="size-3" />}
        {apiKeySaving ? 'Setting...' : 'Set API Key & Switch to SDK Mode'}
      </Button>
    </div>
  );
}
