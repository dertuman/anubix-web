'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, EyeIcon, EyeOffIcon, Loader2 } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import {
  getApiKey,
  getBridgeUrl,
  setApiKey,
  setBridgeUrl,
} from '@/lib/stores/bridge-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BridgeSetupProps {
  onConnect: (_url: string, _apiKey: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function BridgeSetup({ onConnect, isConnecting, error }: BridgeSetupProps) {
  const t = useScopedI18n('code.bridgeSetup');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setUrl(getBridgeUrl() || '');
    setKey(getApiKey() || '');
  }, []);

  const handleConnect = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setBridgeUrl(trimmedUrl);
    setApiKey(key.trim());
    onConnect(trimmedUrl, key.trim());
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/6 bg-card/30 p-6 backdrop-blur-sm">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="size-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="text-sm text-destructive">
                {error.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bridge-url">{t('urlLabel')}</Label>
            <Input
              id="bridge-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('urlPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bridge-key">{t('keyLabel')}</Label>
            <div className="relative">
              <Input
                id="bridge-key"
                type={showApiKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t('keyPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey((prev) => !prev)}
              >
                {showApiKey ? (
                  <EyeIcon className="size-4" aria-hidden="true" />
                ) : (
                  <EyeOffIcon className="size-4" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {showApiKey ? 'Hide API key' : 'Show API key'}
                </span>
              </Button>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={!url.trim() || isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('connecting')}
              </>
            ) : (
              t('connect')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
