'use client';

export interface SystemMessageProps {
  text: string;
}

export function SystemMessage({ text }: SystemMessageProps) {
  return <div className="flex justify-center"><p className="text-xs text-muted-foreground/60">{text}</p></div>;
}
