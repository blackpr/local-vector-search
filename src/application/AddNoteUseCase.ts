import type { Note, NewNote } from '../domain/Note';
import type { NoteRepository } from '../domain/NoteRepository';
import type { SearchService } from '../domain/SearchService';
import type { VectorService } from '../domain/VectorService';
import type { TaggingSystem } from '../domain/TaggingSystem';

export class AddNoteUseCase {
  private noteRepository: NoteRepository;
  private searchService: SearchService;
  private vectorService: VectorService;
  private taggingSystem?: TaggingSystem;

  constructor(
    noteRepository: NoteRepository,
    searchService: SearchService,
    vectorService: VectorService,
    taggingSystem?: TaggingSystem,
  ) {
    this.noteRepository = noteRepository;
    this.searchService = searchService;
    this.vectorService = vectorService;
    this.taggingSystem = taggingSystem;
  }

  /**
   * Everything happens on Save: suggest tags (merged with any the user typed),
   * embed the text, pick a category if none was given, write the row.
   */
  async execute(text: string, category: string, tags: string[] = []): Promise<Note> {
    if (this.taggingSystem) {
      const suggested = await this.taggingSystem.generateTags(text).catch(() => [] as string[]);
      tags = [...new Set([...tags, ...suggested])];
    }

    const embedding = await this.vectorService.generateEmbedding(text);

    let finalCategory = category;
    if (!finalCategory || finalCategory.trim() === '') {
      // `embedding` uses the document prefix, not the query prefix normal search
      // uses. That's fine here: we want notes similar to this note (doc vs doc).
      const similarNotes = await this.searchService.search(text, 5, 0, embedding);

      const categoryCounts = new Map<string, number>();
      for (const note of similarNotes) {
        if (note.category) {
          categoryCounts.set(note.category, (categoryCounts.get(note.category) || 0) + 1);
        }
      }

      let maxCount = 0;
      let winner: string | undefined;
      for (const [cat, count] of categoryCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          winner = cat;
        }
      }
      finalCategory = winner ?? 'Uncategorized';
    }

    const newNote: NewNote = { text, category: finalCategory, tags, uuid: crypto.randomUUID() };
    return this.noteRepository.save(newNote, embedding);
  }
}
