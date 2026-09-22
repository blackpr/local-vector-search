import type { TaggingSystem } from '../domain/TaggingSystem';
import type { VectorService } from '../domain/VectorService';
import { extractHashtags, extractKeyphraseCandidates } from '../domain/KeyphraseCandidates';

const MAX_TAGS = 5;
/** A two-word phrase must describe the note better than either of its words alone. */
const PHRASE_MARGIN = 0.05;
/** Trade-off between "close to the note" (1) and "different from tags already picked" (0). */
const DIVERSITY = 0.6;
const SHORTLIST = 25;

/**
 * Tagging without a text-generating model (the KeyBERT idea).
 *
 * An embedding model cannot write tags, but it can MEASURE them:
 *   1. take every word and two-word phrase in the note as a candidate tag
 *   2. embed the note and every candidate with the same model
 *   3. the candidates whose vectors sit closest to the note's vector are the
 *      words that best stand for the whole note
 *   4. pick the top few, skipping near-duplicates (maximal marginal relevance)
 *
 * No second model to download, and it works in every language the embedding
 * model knows. Limitation: a tag is always a word that appears in the note.
 */
export class EmbeddingTaggingService implements TaggingSystem {
  private readonly vectorService: VectorService;

  constructor(vectorService: VectorService) {
    this.vectorService = vectorService;
  }

  async generateTags(text: string): Promise<string[]> {
    const manualTags = extractHashtags(text);
    try {
      const candidates = extractKeyphraseCandidates(text.replace(/#[\p{L}\p{N}_]+/gu, ' '))
        // similar lengths batch together, so less padding and less compute
        .sort((a, b) => a.key.length - b.key.length);
      if (candidates.length === 0) return manualTags;

      // The note goes in alone: a batch is padded to its longest text, so mixing
      // one long note with many two-word candidates would make every candidate
      // as expensive as the note.
      const [noteVector] = await this.vectorService.generateSimilarityEmbeddings([text]);
      const vectors = await this.vectorService.generateSimilarityEmbeddings(candidates.map((c) => c.key));
      let scored = candidates.map((c, i) => ({ ...c, vector: vectors[i], score: dot(noteVector, vectors[i]) }));

      const scoreOf = new Map(scored.map((c) => [c.key, c.score]));
      scored = scored.filter((c) => {
        if (c.words.length === 1) return true;
        const bestWord = Math.max(...c.words.map((w) => scoreOf.get(w) ?? 0));
        return c.score > bestWord + PHRASE_MARGIN;
      });

      const pool = scored.sort((a, b) => b.score - a.score).slice(0, SHORTLIST);
      const chosen: typeof pool = [];
      while (chosen.length < MAX_TAGS && pool.length > 0) {
        let bestIndex = 0;
        let bestValue = -Infinity;
        pool.forEach((candidate, i) => {
          const redundancy = chosen.length ? Math.max(...chosen.map((c) => dot(candidate.vector, c.vector))) : 0;
          const value = DIVERSITY * candidate.score - (1 - DIVERSITY) * redundancy;
          if (value > bestValue) {
            bestValue = value;
            bestIndex = i;
          }
        });
        const [next] = pool.splice(bestIndex, 1);
        const overlaps = chosen.some((c) => c.key.includes(next.key) || next.key.includes(c.key));
        if (!overlaps) chosen.push(next);
      }

      return [...new Set([...manualTags, ...chosen.map((c) => c.key)])];
    } catch (err) {
      console.error('Tagging failed', err);
      return manualTags;
    }
  }
}

/** Vectors are normalised, so the dot product is the cosine similarity. */
function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
