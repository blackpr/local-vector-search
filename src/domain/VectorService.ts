export interface VectorService {
  /**
   * Identifies the model + weight precision that produced the stored vectors.
   * Vectors from different versions are not comparable, so the app re-embeds
   * every note when this changes.
   */
  readonly version: string;
  generateEmbedding(text: string, isQuery?: boolean): Promise<Float32Array>;
}
