const WORDS_PER_MINUTE = 200;

/** Strip HTML tags and collapse whitespace to a plain-text word count. */
export function countWords(html: string): number {
  if (!html) return 0;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

/** Estimated reading time in whole minutes (min 1) from post HTML. */
export function readingTimeMinutes(html: string): number {
  return Math.max(1, Math.ceil(countWords(html) / WORDS_PER_MINUTE));
}
