/**
 * Humanization rules — everything we inject into prompts and post-process
 * output with so AI-generated articles don't trip GPTZero / Originality.ai /
 * Turnitin / Copyleaks.
 *
 * Three axes detectors measure:
 *   1. Perplexity — how predictable the next token is (low = AI-looking)
 *   2. Burstiness — variance in sentence length & complexity (low = AI-looking)
 *   3. N-gram fingerprints — phrases models overuse ("delve into", em-dash bait)
 *
 * Our response: raise perplexity with opinionated voice, raise burstiness with
 * deliberate rhythm rules, and ban the fingerprint phrases outright.
 */

/** Words and phrases that scream "AI wrote this". Banned in the prompt. */
export const FORBIDDEN_PHRASES = [
  // Transitional filler
  'in conclusion',
  'in summary',
  'to summarize',
  'in today\'s digital landscape',
  'in the ever-evolving',
  'in the realm of',
  'in the world of',
  'it is important to note',
  'it\'s worth noting',
  'it\'s important to understand',
  'one must consider',
  'needless to say',
  'at the end of the day',
  'when all is said and done',
  // Overused verbs / metaphors
  'delve into',
  'delve deeper',
  'dive deep',
  'dive into',
  'embark on',
  'embark on a journey',
  'navigate the',
  'navigate through',
  'unleash the power',
  'unlock the potential',
  'harness the power',
  'leverage the power',
  'revolutionize',
  'game-changer',
  'game changer',
  'pivotal',
  'paradigm shift',
  // Abstract nouns AI loves
  'tapestry',
  'landscape',
  'realm',
  'journey',
  'ecosystem of',
  'symphony of',
  'plethora of',
  'myriad of',
  // Hedges
  'moreover',
  'furthermore',
  'additionally,',
  'notably,',
  'indeed,',
  // Closing clichés
  'stay tuned',
  'the future is bright',
  'the possibilities are endless',
  // The "not X but Y" tic
  'it\'s not just',
  'it isn\'t just',
];

/**
 * Rules we inject as a system prompt block. Long on purpose — each bullet
 * addresses a specific detector signal.
 */
export const HUMANIZATION_RULES = `
## Voice and rhythm

Write like a specific person who has actually done the thing — not like a content marketer, and not like a model trying to sound human. Use these rules:

- **Vary sentence length hard.** Three-word sentence. Then twenty-two. Then eight. Detectors measure variance; monotone rhythm is the #1 AI tell.
- **Use contractions freely.** "You're", "it's", "don't", "can't", "we've". Contractions lower perplexity predictability in a human-looking way.
- **Start sentences with And, But, So, Because, Or.** Grammar teachers hate it. Humans do it constantly.
- **Have opinions.** Say "I'd pick X over Y" or "this is overrated" rather than hedging with "some might argue". Models hedge; humans commit.
- **Get specific.** Real numbers (\`"cut cold-start from 2.4s to 180ms"\`), real version numbers, real filenames. Vague generalities read as AI.
- **Show the seams.** Mention when something was annoying, when a doc was wrong, when you got stuck. Perfection reads as AI.
- **Asides and parentheticals** (the kind a human drops mid-thought) — use them occasionally.
- **Rhetorical questions** — one or two per article, not more.

## Structure

- Open with a concrete hook — a sentence that could only be written by someone who was actually there. Not "In today's fast-paced world of AI".
- Prefer short paragraphs. Two or three sentences. Walls of text with uniform length look AI-generated.
- Use H2 and H3 headings for skimmability, but don't make every section symmetric. Some sections are long, some short, some just a paragraph.
- End with a concrete takeaway or a pointed opinion — never "In conclusion, ...".

## Forbidden words and phrases

Never use any of these (detectors fingerprint them):

${FORBIDDEN_PHRASES.map((p) => `  - "${p}"`).join('\n')}

Also avoid:
- Starting a section with "Moreover" / "Furthermore" / "Additionally".
- The "not X, it's Y" reversal pattern.
- Triadic lists ("fast, scalable, and reliable"). Pair lists read more human.
- Em-dashes used more than once every ~300 words. (Heavy em-dash use is an AI signal — commas and parentheses are more human.)

## Formatting

- HTML only. No markdown. Wrap paragraphs in <p>, headings in <h2>/<h3>, bold in <strong>, italic in <em>, lists in <ul>/<ol>.
- Code snippets in <pre><code>...</code></pre>. Inline code in <code>.
- Links: <a href="...">text</a>.
- Never output <html>, <head>, <body>, or <article> wrappers. Just the content.
`.trim();

/**
 * Post-process: strip code fences, strip stray <html>/<body> wrappers, and
 * flag forbidden phrases (so we can optionally re-humanize).
 */
export function cleanHtmlOutput(raw: string): string {
  let html = raw.trim();

  // Strip ```html ... ``` fences if the model added them
  html = html.replace(/^```(?:html|HTML)?\s*\n?/m, '').replace(/```\s*$/m, '').trim();

  // Strip outer document tags if present
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '').trim();
  html = html.replace(/<\/?(html|body|head|article|main)[^>]*>/gi, '').trim();

  return html;
}

/**
 * Count forbidden phrases in a chunk of text. Used to decide whether to
 * run an extra humanization pass.
 */
export function countForbiddenPhrases(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of FORBIDDEN_PHRASES) {
    let from = 0;
    while (true) {
      const idx = lower.indexOf(phrase, from);
      if (idx === -1) break;
      count++;
      from = idx + phrase.length;
    }
  }
  return count;
}

/**
 * Rough reading time: 220 wpm for web reading.
 */
export function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.round(words / 220));
}
