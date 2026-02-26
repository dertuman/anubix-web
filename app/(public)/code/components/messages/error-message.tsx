'use client';

import { XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface ErrorMessageProps {
  error: string;
  subtype?: string;
}

export function ErrorMessage({ error, subtype }: ErrorMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="space-y-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <XCircle className="size-3.5 text-destructive" />
          {subtype && <Badge variant="destructive" className="text-[10px]">{subtype}</Badge>}
        </div>
        <p className="text-sm text-foreground/80">{error}</p>
      </div>
    </div>
  );
}
