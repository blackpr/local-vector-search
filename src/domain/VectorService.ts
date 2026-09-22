export interface VectorService {
  /**
   * Identifies the model + weight precision that produced the stored vectors.
   * Vectors from different versions are not comparable, so the app re-embeds
   * every note when this changes.
   */
  readonly version: string;
  generateEmbedding(text: string, isQuery?: boolean): Promise<Float32Array>;
  /**
   * Embeds several texts so they can be compared WITH EACH OTHER (not query
   * against document). Used for tagging. Not comparable with stored note vectors.
   */
  generateSimilarityEmbeddings(texts: string[]): Promise<Float32Array[]>;
}
