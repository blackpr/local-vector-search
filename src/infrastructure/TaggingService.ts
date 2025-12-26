import { pipeline, type TextGenerationPipeline } from '@huggingface/transformers';

import { type TaggingSystem } from '../domain/TaggingSystem';

const MODEL_ID = 'Xenova/LaMini-Flan-T5-77M';

export class TaggingService implements TaggingSystem {
  private generator: TextGenerationPipeline | null = null;
  private trace: string[] = [];
  private onProgress?: (data: any) => void;

  constructor(onProgress?: (data: any) => void) {
    this.onProgress = onProgress;
  }

  private log(msg: string) {
    this.trace.push(msg);
  }

  async initialize() {
    if (this.generator) return;
    this.log('InitStart');
    try {
      // @ts-ignore
      this.generator = await pipeline('text2text-generation', MODEL_ID, {
        device: 'auto',
        dtype: 'fp32',
        progress_callback: (data: any) => {
          if (this.onProgress) {
            this.onProgress(data);
          }
        },
      });
      this.log('InitDone');
    } catch (e) {
      this.log(`InitFail:${(e as Error).name}`);
      throw e;
    }
  }

  async generateTags(text: string): Promise<string[]> {
    this.trace = []; // Reset trace
    const manualTags = this.extractHashtags(text);

    try {
      if (!this.generator) await this.initialize();
      if (!this.generator) return ['Err:NoGenerator', ...this.trace];

      const prompt = `Extract keywords: ${text}`;
      this.log('GenStart');

      const output = await this.generator(prompt, {
        max_new_tokens: 50,
        do_sample: false,
      });

      this.log('GenDone');

      // @ts-ignore
      const generatedText = output?.[0]?.generated_text || '';
      this.log(`TxtLen:${generatedText.length}`);

      if (generatedText.length === 0) {
        this.log('EmptyTxt');
        if (manualTags.length > 0) return manualTags;
        return this.trace; // Return trace as tags
      }

      const tags = generatedText.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
      let aiTags: string[] = tags;

      if (tags.length === 0) {
        // If comma split fails, try space split
        const spaceTags = generatedText.split(' ').map((t: string) => t.trim()).filter((t: string) => t.length > 2);
        if (spaceTags.length > 0) {
          aiTags = spaceTags;
        } else {
          aiTags = [];
        }
      }

      // Merge and deduplicate
      return [...new Set([...manualTags, ...aiTags])];

    } catch (err) {
      console.error(err);
      return manualTags; // Return at least manual tags on error
    }
  }

  private extractHashtags(text: string): string[] {
    const matches = text.match(/#[\p{L}\p{N}_]+/gu);
    if (!matches) return [];
    return matches.map(t => t.slice(1)); // Remove '#'
  }
}
