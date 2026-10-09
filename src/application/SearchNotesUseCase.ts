import type { SearchResult, SearchService } from '../domain/SearchService';
import type { VectorService } from '../domain/VectorService';

export class SearchNotesUseCase {
  private searchService: SearchService;
  private vectorService: VectorService;
  // Refreshes (another tab changed the data) and "Load more" repeat the same
  // question: reuse its vector instead of running the model again.
  private lastQuery?: string;
  private lastVector?: Float32Array;

  constructor(searchService: SearchService, vectorService: VectorService) {
    this.searchService = searchService;
    this.vectorService = vectorService;
  }

  async execute(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
    let queryVector = query === this.lastQuery ? this.lastVector : undefined;
    if (!queryVector) {
      queryVector = await this.vectorService.generateEmbedding(query, true);
      this.lastQuery = query;
      this.lastVector = queryVector;
    }
    return this.searchService.search(query, limit, offset, queryVector);
  }
}
