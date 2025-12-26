export interface VectorService {
  generateEmbedding(text: string, isQuery?: boolean): Promise<Float32Array>;
}
