// Shiki singleton highlighter with in-memory cache.
// Isolated from React so the highlighter is created once per page.

import type { Highlighter, BundledLanguage } from 'shiki';
import { createHighlighter } from 'shiki';

const LANGS: BundledLanguage[] = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'json',
  'bash',
  'shell',
  'python',
  'kotlin',
  'go',
  'rust',
  'sql',
  'yaml',
  'html',
  'css',
  'diff',
  'markdown',
];

const THEMES = {
  light: 'github-light',
  dark: 'github-dark-dimmed',
} as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEMES.light, THEMES.dark],
      langs: LANGS,
    });
  }
  return highlighterPromise;
}

const cache = new Map<string, string>();

function normalizeLang(lang: string | undefined): BundledLanguage | 'plaintext' {
  if (!lang) return 'plaintext';
  const lower = lang.toLowerCase();
  if (lower === 'sh') return 'bash';
  if (lower === 'ts') return 'typescript';
  if (lower === 'js') return 'javascript';
  if (lower === 'py') return 'python';
  if (lower === 'kt') return 'kotlin';
  if (lower === 'rs') return 'rust';
  if (lower === 'yml') return 'yaml';
  if (lower === 'md') return 'markdown';
  if ((LANGS as string[]).includes(lower)) return lower as BundledLanguage;
  return 'plaintext';
}

export async function highlight(source: string, lang: string | undefined): Promise<string> {
  const resolvedLang = normalizeLang(lang);
  const key = `${resolvedLang}::${source}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(source, {
    lang: resolvedLang,
    themes: THEMES,
    defaultColor: false,
  });
  cache.set(key, html);
  return html;
}
