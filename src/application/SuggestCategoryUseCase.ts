import { SearchNotesUseCase } from './SearchNotesUseCase';

export class SuggestCategoryUseCase {
  private readonly searchNotesUseCase: SearchNotesUseCase;

  constructor(searchNotesUseCase: SearchNotesUseCase) {
    this.searchNotesUseCase = searchNotesUseCase;
  }

  async execute(text: string): Promise<string | null> {
    // limit to 10 results for suggestion context
    const results = await this.searchNotesUseCase.execute(text, 10);

    const categoryCounts: Record<string, number> = {};
    results.forEach(r => {
      if (r.category) {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
      }
    });

    const topCategory = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a])[0];
    return topCategory || null;
  }
}
