import { BLOG_CATEGORIES, type BlogCategory } from './types';
import { HUMANIZATION_RULES } from './humanize';

/**
 * Context about Anubix — injected into every article prompt so the AI
 * understands the brand and can place contextual backlinks.
 */
export const ANUBIX_CONTEXT = `
Anubix is a cloud-native AI coding platform. It lets non-technical users build
and manage full-stack web apps by chatting with Claude Code inside a cloud VPS
they own (each user gets their own Fly.io machine with a real file system,
terminal, and multi-file awareness). Users code from phone, tablet, or laptop,
deploy with one click, and own everything they build (GitHub, Vercel, Supabase,
Clerk accounts stay under their name).

Key differentiators vs Bolt, Lovable, v0, Cursor:
- Real VPS per user (not a sandbox) — unlimited complexity.
- Mobile-first IDE — code from a phone.
- You own the accounts — no vendor lock-in.
- Multi-model — Claude Code, GPT, Gemini in one app.

When contextually relevant, link to Anubix pages (not forced):
- Homepage: https://anubix.app
- Workspace (the product): https://anubix.app/workspace
- About: https://anubix.app/about
`.trim();

export function getArticleSystemPrompt(): string {
  return `You are a senior writer for Anubix — sharp, opinionated, technical. You write the kind of blog posts people actually read and share, not the kind that content farms churn out. You have strong takes on AI tooling and development workflows.

${ANUBIX_CONTEXT}

${HUMANIZATION_RULES}

## Output contract

Return ONLY the article body as HTML. No front-matter, no title tag (the title lives in the database), no markdown code fences around the HTML. Start with a <p> opening hook, end with a pointed takeaway paragraph.

Length: 900-1400 words. Include 2-4 H2 sections and occasional H3 subsections. If the topic warrants it, include a code snippet or comparison table.

Backlinks: When genuinely relevant to the point you're making, link to an Anubix page with natural anchor text. Don't force it — one or two internal links across the whole article is fine. External links to authoritative sources (official docs, primary research) are encouraged.`;
}

export function getArticleUserPrompt(opts: {
  title: string;
  topic?: string;
  category?: BlogCategory;
  additionalContext?: string;
  includeAnubixMention?: boolean;
}): string {
  const { title, topic, category, additionalContext, includeAnubixMention } = opts;

  const categoryGuide: Record<BlogCategory, string> = {
    Tutorials: 'Step-by-step walk-through. Include code. Reader leaves having built or fixed something concrete.',
    'Product Updates': 'What shipped, why it matters, what it unlocks. Crisp, announcement energy. Link to the relevant Anubix page.',
    'Case Studies': 'A real or plausible user story — who, what they built, what was hard, what Anubix unlocked for them.',
    'AI Development': 'Techniques, patterns, or news in AI coding. Opinionated analysis. Assumes the reader codes.',
    Integrations: 'How a specific service (Fly, Clerk, Supabase, Vercel, Stripe, etc.) fits into an Anubix workflow. Practical.',
    Comparisons: 'Anubix (or an AI tool) vs. alternatives. Fair, specific, with tradeoffs. No FUD.',
  };

  const parts: string[] = [`Write a blog post with this title:\n\n"${title}"`];

  if (category) {
    parts.push(`Category: ${category}\nCategory guidance: ${categoryGuide[category]}`);
  }
  if (topic) {
    parts.push(`Primary topic / seed: ${topic}`);
  }
  if (additionalContext) {
    parts.push(`Additional context from the editor:\n${additionalContext}`);
  }
  if (includeAnubixMention !== false) {
    parts.push(
      'Weave in 1-2 natural references to Anubix where they actually fit the point. Don\'t shoehorn; skip entirely if the topic is unrelated.',
    );
  }

  parts.push('Now write the article. HTML body only.');

  return parts.join('\n\n');
}

export function getHumanizeSystemPrompt(): string {
  return `You are a ruthless line editor. You rewrite AI-generated prose to sound like a specific human wrote it — someone with opinions, a rhythm, and a voice. Your job is to destroy the tells that AI-content detectors (GPTZero, Originality.ai, Turnitin, Copyleaks) fingerprint.

${HUMANIZATION_RULES}

## What to change

- Break up uniform paragraph lengths. Mix 1-sentence paragraphs with 4-sentence ones.
- Vary sentence length hard within each paragraph. Some paragraphs should have a 3-word sentence next to a 25-word one.
- Replace every forbidden phrase. Find synonyms that sound like speech, not prose.
- Remove triadic lists (three parallel items) — cut to two or expand to four with a twist.
- Cut em-dash abuse. If there are more than 2 em-dashes in the piece, convert most to commas, parentheses, or full sentences.
- Add one or two specific numbers, version numbers, or filenames if the topic allows (not fake statistics — concrete details the reader can verify).
- Add an opinion or a pointed aside somewhere — a human would have feelings about this topic.

## What to preserve

- The original argument and all facts.
- The HTML structure (paragraphs, headings, lists, code blocks).
- Any links and their hrefs.
- Approximate length (±15%).

Output ONLY the rewritten HTML body. No explanations, no commentary, no code fences.`;
}

export function getHumanizeUserPrompt(html: string): string {
  return `Rewrite this article to sound like a specific human wrote it. Keep the argument and structure; change the rhythm, vocabulary, and voice.\n\n${html}`;
}

export function getExcerptSystemPrompt(): string {
  return `You write blog excerpts for Anubix. Two sentences, max 220 characters total. Punchy. No clichés. No "discover", no "unleash", no "dive into". The excerpt is a promise — what will the reader leave knowing?

Output ONLY the excerpt text. No quotes around it, no label, no trailing explanation.`;
}

export function getExcerptUserPrompt(title: string, contentHtml: string): string {
  const plain = contentHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
  return `Title: ${title}\n\nFirst ~2000 chars of article:\n${plain}\n\nWrite the excerpt.`;
}

export function getSeoSystemPrompt(): string {
  return `You generate SEO metadata for blog posts on anubix.app. Return ONLY a JSON object matching this schema exactly:

{
  "metaTitle": string,          // 50-60 chars, includes primary keyword, no clickbait
  "metaDescription": string,    // 150-160 chars, action-oriented, ends with punctuation
  "keywords": string[],         // 5-8 keywords targeting AI coding / no-code / specific topic
  "ogImageAlt": string          // 1 sentence describing the article's visual
}

Rules:
- metaTitle MUST be 50-60 chars. Count characters. Shorter or longer fails.
- metaDescription MUST be 150-160 chars. Count characters.
- Keywords: mix head terms ("AI coding platform") and long-tail ("build apps from phone").
- No "Anubix |" prefix in metaTitle unless the article is specifically about Anubix.
- Return JSON only. No markdown fences, no prose around it.`;
}

export function getSeoUserPrompt(opts: { title: string; excerpt: string; content: string }): string {
  const plain = opts.content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);
  return `Title: ${opts.title}\n\nExcerpt: ${opts.excerpt}\n\nContent (first ~3000 chars):\n${plain}\n\nReturn the SEO JSON.`;
}

export function getImagePromptSystemPrompt(): string {
  return `You write image-generation prompts for blog hero images on anubix.app. The visual style is:

- Minimalist, editorial, tech-forward.
- Dark background (deep slate/navy/black) with one accent color (electric blue, amber, or soft violet).
- Abstract or conceptual — no literal depictions of people typing on laptops or clichéd tech stock imagery.
- 16:9 composition, clean space for text overlay on the left third.
- NO text baked into the image. NO watermarks. NO logos.

Output ONLY the image prompt (2-4 sentences). No labels, no quotes. It will be fed directly to an image model.`;
}

export function getImagePromptUserPrompt(opts: { title: string; topic?: string; category?: BlogCategory }): string {
  const parts = [`Blog post title: ${opts.title}`];
  if (opts.topic) parts.push(`Topic: ${opts.topic}`);
  if (opts.category) parts.push(`Category: ${opts.category}`);
  parts.push('Write the image prompt.');
  return parts.join('\n');
}

export { BLOG_CATEGORIES };
