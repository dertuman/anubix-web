'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';
import { highlight } from './shiki-highlighter';

interface MarkdownContentProps {
  text: string;
  className?: string;
  isStreaming?: boolean;
}

function CodeBlock({ source, lang }: { source: string; lang: string | undefined }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    highlight(source, lang)
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [source, lang]);

  if (html === null) {
    return (
      <pre className="my-2 overflow-x-auto rounded-lg bg-code text-code-foreground p-3 text-xs leading-relaxed font-mono">
        <code>{source}</code>
      </pre>
    );
  }

  return (
    <div
      className="my-2 overflow-x-auto rounded-lg bg-code [&>pre]:!p-3 [&>pre]:!m-0 [&>pre]:bg-code text-xs leading-relaxed [&_code]:font-mono"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MarkdownContent({ text, className, isStreaming }: MarkdownContentProps) {
  void isStreaming; // reserved for future streaming-specific tweaks

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => <h1 className="mt-3 mb-1.5 text-base font-semibold">{children}</h1>,
      h2: ({ children }) => <h2 className="mt-2.5 mb-1 text-sm font-semibold">{children}</h2>,
      h3: ({ children }) => (
        <h3 className="mt-2 mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {children}
        </h3>
      ),
      h4: ({ children }) => <h4 className="mt-1.5 mb-0.5 text-xs font-semibold">{children}</h4>,
      h5: ({ children }) => (
        <h5 className="mt-1.5 mb-0.5 text-xs font-medium text-muted-foreground">{children}</h5>
      ),
      h6: ({ children }) => (
        <h6 className="mt-1.5 mb-0.5 text-xs font-medium text-muted-foreground">{children}</h6>
      ),
      p: ({ children }) => <p className="my-1.5">{children}</p>,
      ul: ({ children, className: cls }) => {
        const isTaskList = typeof cls === 'string' && cls.includes('contains-task-list');
        return (
          <ul
            className={cn(
              'my-1.5 ml-5 space-y-0.5 marker:text-muted-foreground/60',
              isTaskList ? 'list-none ml-0' : 'list-disc',
            )}
          >
            {children}
          </ul>
        );
      },
      ol: ({ children }) => (
        <ol className="my-1.5 ml-5 list-decimal space-y-0.5 marker:text-muted-foreground/60">
          {children}
        </ol>
      ),
      li: ({ children, className: cls }) => {
        const isTask = typeof cls === 'string' && cls.includes('task-list-item');
        return <li className={cn(isTask ? 'list-none pl-0' : 'pl-0.5')}>{children}</li>;
      },
      blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-border/50 pl-3 italic text-muted-foreground">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-2 border-border/30" />,
      a: ({ children, href }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-info underline underline-offset-2 hover:text-info/80"
        >
          {children}
        </a>
      ),
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
      code: ({ className: cls, children, ...rest }) => {
        const inline = !(rest as { node?: { position?: { start: { line: number }; end: { line: number } } } }).node
          || !cls;
        const match = /language-(\w+)/.exec(cls ?? '');
        const isFenced = !!match;
        if (!isFenced && inline) {
          return (
            <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          );
        }
        const source = String(children).replace(/\n$/, '');
        return <CodeBlock source={source} lang={match?.[1]} />;
      },
      pre: ({ children }) => <>{children}</>,
      table: ({ children }) => (
        <table className="my-2 w-full border-collapse text-xs">{children}</table>
      ),
      thead: ({ children }) => <thead className="border-b border-border/40">{children}</thead>,
      th: ({ children }) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
      td: ({ children }) => (
        <td className="border-t border-border/30 px-2 py-1 align-top">{children}</td>
      ),
      input: ({ type, checked, disabled }) => {
        if (type === 'checkbox') {
          return (
            <input
              type="checkbox"
              checked={!!checked}
              disabled={disabled ?? true}
              readOnly
              className="mr-1.5 size-3 align-middle accent-primary"
            />
          );
        }
        return null;
      },
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      img: ({ src, alt }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={typeof src === 'string' ? src : ''}
          alt={alt ?? ''}
          loading="lazy"
          className="my-2 max-w-full rounded-md"
        />
      ),
    }),
    [],
  );

  return (
    <div
      className={cn(
        'text-sm leading-relaxed [&>:first-child]:mt-0 [&>:last-child]:mb-0',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
