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

  async execute(text: string, category: string): Promise<Note> {
    const embedding = await this.vectorService.generateEmbedding(text);

    let finalCategory = category;

    // Automatic LLM Categorization (k-NN via Vector Search)
    // We cast to any to access 'search' if not available in NoteRepository interface, 
    // or we should ensure NoteRepository includes Search capability or we inject SearchService separately.
    // In this composition listNotesUseCase has repo, searchNotesUseCase has repo... 
    // For now, noteRepository IS SqliteNoteRepository which has search.
    // But typed as NoteRepository.
    // Let's assume we can cast or we should inject SearchService.

    if (!finalCategory || finalCategory.trim() === '') {
      // Find top 5 similar notes
      // Using 'any' cast to bypass strict interface limit if 'search' is not on NoteRepository
      // Ideally NoteRepository should extend SearchService or we inject it independently.
      // Given existing pattern:
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

    const newNote: NewNote = { text, category: finalCategory, uuid: crypto.randomUUID() };
    return this.noteRepository.save(newNote, embedding);
  }
}
