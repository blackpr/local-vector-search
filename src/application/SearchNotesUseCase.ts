import type { SearchResult, SearchService } from '../domain/SearchService';
import type { VectorService } from '../domain/VectorService';

export class SearchNotesUseCase {
  private searchService: SearchService;
  private vectorService: VectorService;

  constructor(searchService: SearchService, vectorService: VectorService) {
    this.searchService = searchService;
    this.vectorService = vectorService;
  }

  async execute(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
    const queryVector = await this.vectorService.generateEmbedding(query, true);
    return this.searchService.search(query, limit, offset, queryVector);
  }
}
