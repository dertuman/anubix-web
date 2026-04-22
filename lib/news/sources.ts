/**
 * Curated RSS feeds for the AI News generator.
 *
 * Picked to pull stories that (a) our ICP — senior devs building with AI from
 * mobile — actually reads, and (b) let us riff back toward Anubix's positioning
 * (cloud-native dev, multi-model, mobile-first).
 *
 * Keep this list small. More sources = more noise.
 */

export interface RssSource {
  id: string;
  name: string;
  url: string;
}

export const RSS_SOURCES: RssSource[] = [
  { id: 'anthropic', name: 'Anthropic', url: 'https://www.anthropic.com/news/rss.xml' },
  { id: 'openai', name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { id: 'google-deepmind', name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
  { id: 'vercel', name: 'Vercel', url: 'https://vercel.com/atom' },
  { id: 'github', name: 'GitHub', url: 'https://github.blog/feed/' },
  { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  { id: 'simon-willison', name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/' },
  { id: 'latent-space', name: 'Latent Space', url: 'https://www.latent.space/feed' },
  { id: 'hn-ai', name: 'HN (AI tag)', url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+Claude+OR+GPT&points=50' },
];
