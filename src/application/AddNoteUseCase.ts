import type { Note, NewNote } from '../domain/Note';
import type { NoteRepository } from '../domain/NoteRepository';
import type { VectorService } from '../domain/VectorService';
import type { TaggingSystem } from '../domain/TaggingSystem';

export class AddNoteUseCase {
  private noteRepository: NoteRepository;
  private vectorService: VectorService;
  private taggingSystem?: TaggingSystem;

  constructor(noteRepository: NoteRepository, vectorService: VectorService, taggingSystem?: TaggingSystem) {
    this.noteRepository = noteRepository;
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
      const searchService = this.noteRepository as any;
      if (searchService.search) {
        const similarNotes = await searchService.search(text, 5, embedding);

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
        if (winner) finalCategory = winner;
        else finalCategory = 'Uncategorized';
      } else {
        finalCategory = 'Uncategorized';
      }
    }

    const newNote: NewNote = { text, category: finalCategory, tags, uuid: crypto.randomUUID() };
    return this.noteRepository.save(newNote, embedding);
  }
}
