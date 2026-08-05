/**
 * Keyword-list text <-> array, in exactly one place.
 *
 * The prefilter editor is a plain textarea, but the backend stores an array and
 * normalises it on write: stripped, lowercased, empties dropped, deduped
 * preserving order, 60 characters per entry, 300 entries per list. This module
 * applies the same rules before anything is sent, so the list that comes back
 * from a save is the list the operator typed. Without it a save silently
 * rewrites the box, which reads as the save having gone wrong.
 *
 * The two caps are surfaced as validation rather than applied silently: a
 * truncated keyword is a keyword that no longer matches what it was written to
 * match, and a list quietly cut at 300 discards rules with no trace.
 */

/** Entries per list. Mirrors the backend's cap. */
export const PREFILTER_MAX_KEYWORDS = 300;

/** Characters per entry. Mirrors the backend's cap. */
export const PREFILTER_MAX_KEYWORD_CHARS = 60;

/**
 * Split editor text into the array the API expects.
 *
 * Commas count as separators alongside newlines. A keyword is a word or short
 * phrase — none of them contain a comma — and operators paste comma-separated
 * lists often enough that treating one as a single 200-character "keyword"
 * would be a trap.
 */
export function parseKeywords(text: string): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const fragment of text.split(/[\n,]/)) {
    const keyword = fragment.trim().toLowerCase();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    keywords.push(keyword);
  }

  return keywords;
}

/** Render a stored list back into editor text, one keyword per line. */
export function keywordsToText(keywords: string[]): string {
  return keywords.join("\n");
}

/** What the editor needs to know about the text currently in the box. */
export interface KeywordListState {
  /** Normalised, ready to send. */
  keywords: string[];
  count: number;
  /** Entries longer than the per-entry cap, named so they can be found. */
  tooLong: string[];
  /** True once the list is past the entry cap. */
  overCap: boolean;
  /** False while either cap is breached — Save stays disabled. */
  valid: boolean;
}

export function readKeywordList(text: string): KeywordListState {
  const keywords = parseKeywords(text);
  const tooLong = keywords.filter((k) => k.length > PREFILTER_MAX_KEYWORD_CHARS);
  const overCap = keywords.length > PREFILTER_MAX_KEYWORDS;

  return {
    keywords,
    count: keywords.length,
    tooLong,
    overCap,
    valid: tooLong.length === 0 && !overCap,
  };
}
