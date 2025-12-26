import type { TaggingSystem } from '../domain/TaggingSystem';

export class GenerateTagsUseCase {
  private readonly taggingSystem: TaggingSystem;

  constructor(taggingSystem: TaggingSystem) {
    this.taggingSystem = taggingSystem;
  }

  async execute(text: string): Promise<string[]> {
    return this.taggingSystem.generateTags(text);
  }
}
