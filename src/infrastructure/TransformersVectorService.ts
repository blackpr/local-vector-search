import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type { VectorService } from '../domain/VectorService';

const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';

export class TransformersVectorService implements VectorService {
  private classifier: FeatureExtractionPipeline | null = null;
  private onProgress?: (data: any) => void;

  constructor(onProgress?: (data: any) => void) {
    this.onProgress = onProgress;
  }

  async initialize(): Promise<void> {
    if (this.classifier) return;

    // @ts-ignore - types can be complex
    this.classifier = await pipeline('feature-extraction', MODEL_ID, {
      device: 'auto', // Uses WebGPU if available, falls back to WASM/others
      dtype: 'fp32',    // SQLite expects float32
      progress_callback: (data: any) => {
        if (this.onProgress) {
          this.onProgress(data);
        }
      },
    });
  }

  async generateEmbedding(text: string, isQuery = false): Promise<Float32Array> {
    if (!this.classifier) {
      await this.initialize();
    }
    if (!this.classifier) throw new Error('Classifier failed to initialize');

    // EmbeddingGemma requires specific prompts
    const prefix = isQuery
      ? 'task: search result | query: '
      : 'title: none | text: ';

    const output = await this.classifier(prefix + text, { pooling: 'mean', normalize: true });

    return output.data as Float32Array;
  }
}
