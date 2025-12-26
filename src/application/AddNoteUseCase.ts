import type { Note, NewNote } from '../domain/Note';
import type { NoteRepository } from '../domain/NoteRepository';
import type { VectorService } from '../domain/VectorService';

export class AddNoteUseCase {
  private noteRepository: NoteRepository;
  private vectorService: VectorService;

  constructor(noteRepository: NoteRepository, vectorService: VectorService) {
    this.noteRepository = noteRepository;
    this.vectorService = vectorService;
  }

  async execute(text: string, category: string, tags: string[] = []): Promise<Note> {
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
