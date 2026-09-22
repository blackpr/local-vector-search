/**
 * Pure text logic for tagging: pull candidate words and two-word phrases out of
 * a note. No model involved here; the embedding model only RANKS these.
 */

const STOP_WORDS = new Set(
  (
    // English
    'a an and are as at be but by for from has have i if in into is it its my no not of on or so that the their ' +
    'then there these this to was we what when where which who why will with you your do does did can could would ' +
    'should about after all also any because been before being both each how just like more most much only other ' +
    'our out over same some such than them they those through too under up very via while me am were had he she ' +
    'his her us again once here ' +
    // Greek
    'και να το η ο οι τα τη την της του των τον τους τις σε με για από που πως πώς τι ότι είναι ήταν θα δεν μην μη ' +
    'ένα μια μία ένας στο στη στην στον στα στις στους αλλά ή είτε αν όταν πριν μετά πολύ πιο κάθε αυτό αυτή αυτός ' +
    'αυτά εγώ εσύ μας σας μου σου'
  ).split(' '),
);

const MAX_CANDIDATES = 48;

export interface KeyphraseCandidate {
  /** lower-cased, used as the tag */
  key: string;
  words: string[];
}

function tokenize(segment: string): string[] {
  return (
    segment
      .replace(/['’]s\b/g, '') // "Garcia's" -> "Garcia"
      // words may contain . - ' inside them: transformers.js, sqlite-vec
      .match(/[\p{L}\p{N}][\p{L}\p{N}.\-']*[\p{L}\p{N}]|[\p{L}\p{N}]/gu) || []
  );
}

export function extractKeyphraseCandidates(text: string): KeyphraseCandidate[] {
  // Split at punctuation so a phrase never spans two sentences.
  const segments = text.split(/[.,;:!?()[\]"“”«»\n|/]+\s|[,;:!?()[\]"“”«»\n|]+/u);
  const seen = new Map<string, KeyphraseCandidate>();

  for (const segment of segments) {
    const tokens = tokenize(segment).map((t) => t.toLowerCase());
    for (let n = 1; n <= 2; n++) {
      for (let i = 0; i + n <= tokens.length; i++) {
        const words = tokens.slice(i, i + n);
        if (STOP_WORDS.has(words[0]) || STOP_WORDS.has(words[n - 1])) continue;
        if (words.some((w) => w.length < 2 || /^[\d.]+$/.test(w))) continue;
        const key = words.join(' ');
        if (!seen.has(key)) seen.set(key, { key, words });
      }
    }
  }
  return [...seen.values()].slice(0, MAX_CANDIDATES);
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? matches.map((t) => t.slice(1)) : [];
}
