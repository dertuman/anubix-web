'use client';

import { useCallback, useState } from 'react';
import { Check, Eye, EyeOff, Key, Loader2 } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

interface ApiKeySetupProps {
  providers: string[];
  onKeySaved: () => void;
}

const PROVIDER_INFO = {
  openai: { name: 'OpenAI', placeholder: 'sk-...', url: 'https://platform.openai.com/api-keys' },
  google: { name: 'Google AI', placeholder: 'AIza...', url: 'https://aistudio.google.com/apikey' },
  anthropic: { name: 'Anthropic', placeholder: 'sk-ant-...', url: 'https://console.anthropic.com/settings/keys' },
} as const;

export function ApiKeySetup({ providers, onKeySaved }: ApiKeySetupProps) {
  const t = useScopedI18n('chat.apiKeys');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" title={t('title')}>
          <Key className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="size-4" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t('description')}</p>
        <div className="space-y-4">
          {(Object.keys(PROVIDER_INFO) as Array<keyof typeof PROVIDER_INFO>).map((provider) => (
            <ProviderKeyRow
              key={provider}
              provider={provider}
              info={PROVIDER_INFO[provider]}
              hasKey={providers.includes(provider)}
              onSaved={onKeySaved}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProviderKeyRow({
  provider,
  info,
  hasKey,
  onSaved,
}: {
  provider: string;
  info: { name: string; placeholder: string; url: string };
  hasKey: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSave = useCallback(async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/chat/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: value.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setValue('');
      onSaved();
      toast({ title: 'Key saved', description: `${info.name} API key saved successfully.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to save API key.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [value, provider, info.name, onSaved]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/chat/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      onSaved();
      toast({ title: 'Key removed', description: `${info.name} API key removed.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove API key.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [provider, info.name, onSaved]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{info.name}</Label>
        <div className="flex items-center gap-1.5">
          {hasKey && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
              <Check className="size-3" /> Connected
            </span>
          )}
          <a href={info.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-primary hover:underline">
            Get key →
          </a>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hasKey ? '••••••••••••••••' : info.placeholder}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="h-9 pr-8 text-xs"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
        <Button size="sm" onClick={handleSave} disabled={!value.trim() || saving} className="h-9 shrink-0">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
        </Button>
        {hasKey && (
          <Button size="sm" variant="ghost" onClick={handleDelete} disabled={saving} className="h-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Full-page prompt shown when user has no API keys configured.
 */
export function ApiKeySetupPrompt({ onKeySaved }: { onKeySaved: () => void }) {
  const t = useScopedI18n('chat.apiKeys');

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <Key className="size-7 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">{t('noKeysTitle')}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('noKeysDescription')}</p>
      </div>
      <div className="w-full max-w-sm space-y-4">
        {(Object.keys(PROVIDER_INFO) as Array<keyof typeof PROVIDER_INFO>).map((provider) => (
          <ProviderKeyRow
            key={provider}
            provider={provider}
            info={PROVIDER_INFO[provider]}
            hasKey={false}
            onSaved={onKeySaved}
          />
        ))}
      </div>
    </div>
  );
}
