import type { Note } from './Note';

export interface SearchResult extends Note {
  distance: number;
}

export interface SearchService {
  search(query: string, limit?: number, offset?: number, queryEmbedding?: Float32Array): Promise<SearchResult[]>;
}
