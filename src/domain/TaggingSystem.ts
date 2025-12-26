export interface TaggingSystem {
  generateTags(text: string): Promise<string[]>;
}
