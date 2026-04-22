import Parser from 'rss-parser';

import { RSS_SOURCES, type RssSource } from './sources';

export interface RssCandidate {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  pubDate: string | null;
  snippet: string;
  imageUrl: string | null;
}

const parser = new Parser({
  timeout: 10_000,
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure'],
  },
});

function extractImage(item: Parser.Item): string | null {
  const raw = item as unknown as Record<string, unknown>;

  const mediaContent = raw['media:content'] as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;

  const mediaThumb = raw['media:thumbnail'] as { $?: { url?: string } } | undefined;
  if (mediaThumb?.$?.url) return mediaThumb.$.url;

  const enclosure = raw.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && enclosure.type?.startsWith('image/')) return enclosure.url;

  const html = (raw['content:encoded'] as string | undefined) ?? item.content ?? '';
  const match = String(html).match(/<img[^>]+src="([^"]+)"/i);
  return match?.[1] ?? null;
}

function toSnippet(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

async function fetchOne(source: RssSource): Promise<RssCandidate[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? []).map((item) => ({
      sourceId: source.id,
      sourceName: source.name,
      title: item.title?.trim() ?? '(untitled)',
      link: item.link ?? '',
      pubDate: item.isoDate ?? item.pubDate ?? null,
      snippet: toSnippet(item.contentSnippet ?? item.content ?? item.summary),
      imageUrl: extractImage(item),
    }));
  } catch (err) {
    console.warn(`[rss] failed to fetch ${source.id}: ${(err as Error).message}`);
    return [];
  }
}

export async function fetchAllCandidates(): Promise<RssCandidate[]> {
  const batches = await Promise.all(RSS_SOURCES.map(fetchOne));
  const all = batches.flat().filter((c) => c.link && c.title);

  all.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  return all;
}
