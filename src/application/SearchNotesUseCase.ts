import type { SearchResult, SearchService } from '../domain/SearchService';
import type { VectorService } from '../domain/VectorService';

export class SearchNotesUseCase {
  private searchService: SearchService;
  private vectorService: VectorService;

  constructor(searchService: SearchService, vectorService: VectorService) {
    this.searchService = searchService;
    this.vectorService = vectorService;
  }

  async execute(query: string): Promise<SearchResult[]> {
    const queryVector = await this.vectorService.generateEmbedding(query, true);
    return this.searchService.search(query, 10, queryVector);
  }
}
