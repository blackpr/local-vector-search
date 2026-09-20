import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type { VectorService } from '../domain/VectorService';

const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';

// Precision of the DOWNLOADED WEIGHTS, not of the output. The pipeline returns
// a Float32Array either way, which is what sqlite-vec stores.
//   fp32 ≈ 1235 MB · q8 ≈ 309 MB · q4 ≈ 197 MB
// q4 also has WebGPU kernels (MatMulNBits); q8 mostly falls back to the CPU.
const MODEL_DTYPE = 'q4';

/** Approximate download size, used for the progress bar. */
export const VECTOR_MODEL_BYTES = 200 * 1024 * 1024;

export class TransformersVectorService implements VectorService {
  readonly version = `${MODEL_ID}:${MODEL_DTYPE}`;
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
      dtype: MODEL_DTYPE,
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
