import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type { VectorService } from '../domain/VectorService';

const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';

// Precision of the DOWNLOADED WEIGHTS, not of the output. The pipeline returns
// a Float32Array either way, which is what sqlite-vec stores.
//   fp32 ≈ 1235 MB · q8 ≈ 309 MB · q4 ≈ 197 MB
// q4 also has WebGPU kernels (MatMulNBits); q8 mostly falls back to the CPU.
const MODEL_DTYPE = 'q4';

// EmbeddingGemma's task prompts. Query and document use different ones.
const QUERY_PREFIX = 'task: search result | query: ';
const DOC_PREFIX = 'title: none | text: ';
// On WASM the dinner/kubernetes gap is ~0.25; degenerate output gives ~0.
const SANITY_MIN_GAP = 0.08;

/** Approximate download size, used for the progress bar. */
export const VECTOR_MODEL_BYTES = 200 * 1024 * 1024;

export class TransformersVectorService implements VectorService {
  // "v2": vectors produced before the WebGPU self-test existed may be garbage,
  // so bumping this makes every database re-embed once.
  readonly version = `${MODEL_ID}:${MODEL_DTYPE}:v2`;
  private classifier: FeatureExtractionPipeline | null = null;
  private onProgress?: (data: any) => void;

  constructor(onProgress?: (data: any) => void) {
    this.onProgress = onProgress;
  }

  async initialize(): Promise<void> {
    if (this.classifier) return;

    // WebGPU is faster, but on some GPU/driver/dtype combinations the numbers
    // that come out are silently wrong: every text lands at about the same
    // distance from every other text and search becomes noise. So: try the
    // fast path, check it with two sentences, and fall back to WASM (CPU,
    // slower, always correct) if the check fails.
    //
    // Transformers.js remembers the FIRST session it ever tried to create in
    // this worker. If that one fails, every later load fails with the same
    // error. So never try a device that cannot load: ask the browser first.
    const devices: Array<'webgpu' | 'wasm'> = (await hasWebGpuAdapter()) ? ['webgpu', 'wasm'] : ['wasm'];
    for (const device of devices) {
      const classifier = await this.load(device);
      if (await this.passesSanityCheck(classifier)) {
        console.log(`Vector model: ${MODEL_DTYPE} on ${device}`);
        this.classifier = classifier;
        return;
      }
      console.warn(`Vector model on ${device} produced degenerate embeddings, falling back`);
      await classifier.dispose();
    }
    throw new Error('Could not load the embedding model on WebGPU or WASM');
  }

  private async load(device: 'webgpu' | 'wasm'): Promise<FeatureExtractionPipeline> {
    // @ts-ignore - types can be complex
    return pipeline('feature-extraction', MODEL_ID, {
      device,
      dtype: MODEL_DTYPE,
      progress_callback: (data: any) => {
        if (this.onProgress) {
          this.onProgress(data);
        }
      },
    });
  }

  /** A related pair must be clearly closer than an unrelated pair, and nothing may be NaN. */
  private async passesSanityCheck(classifier: FeatureExtractionPipeline): Promise<boolean> {
    const embed = async (text: string) =>
      (await classifier(text, { pooling: 'mean', normalize: true })).data as Float32Array;
    const note = await embed(DOC_PREFIX + 'pasta with garlic, olive oil and tomatoes');
    const related = await embed(QUERY_PREFIX + 'something quick for dinner');
    const unrelated = await embed(QUERY_PREFIX + 'kubernetes pod keeps restarting');
    const all = [note, related, unrelated];
    if (all.some((v) => v.length === 0 || Array.from(v).some((x) => !Number.isFinite(x)))) return false;
    const gap = cosine(note, related) - cosine(note, unrelated);
    console.log(`Vector model sanity check: gap = ${gap.toFixed(3)} (need > ${SANITY_MIN_GAP})`);
    return gap > SANITY_MIN_GAP;
  }

  async generateEmbedding(text: string, isQuery = false): Promise<Float32Array> {
    if (!this.classifier) {
      await this.initialize();
    }
    if (!this.classifier) throw new Error('Classifier failed to initialize');

    // EmbeddingGemma requires specific prompts
    const prefix = isQuery ? QUERY_PREFIX : DOC_PREFIX;

    const output = await this.classifier(prefix + text, { pooling: 'mean', normalize: true });

    return output.data as Float32Array;
  }

  async generateSimilarityEmbeddings(texts: string[]): Promise<Float32Array[]> {
    if (!this.classifier) {
      await this.initialize();
    }
    if (!this.classifier) throw new Error('Classifier failed to initialize');
    if (texts.length === 0) return [];

    // EmbeddingGemma's prompt for "put similar texts close together".
    const prefix = 'task: clustering | query: ';
    const vectors: Float32Array[] = [];
    // Small batches keep memory flat on the WASM backend.
    const BATCH = 16;
    for (let start = 0; start < texts.length; start += BATCH) {
      const batch = texts.slice(start, start + BATCH).map((t) => prefix + t);
      const output = await this.classifier(batch, { pooling: 'mean', normalize: true });
      const size = output.dims[output.dims.length - 1];
      const data = output.data as Float32Array;
      for (let i = 0; i < batch.length; i++) {
        vectors.push(data.slice(i * size, (i + 1) * size));
      }
    }
    return vectors;
  }
}

async function hasWebGpuAdapter(): Promise<boolean> {
  try {
    const gpu = (navigator as any).gpu;
    if (!gpu) return false;
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

function cosine(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
