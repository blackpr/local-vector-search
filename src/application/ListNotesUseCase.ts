import type { Note } from '../domain/Note';
import type { NoteRepository } from '../domain/NoteRepository';

export class ListNotesUseCase {
  private noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  async execute(limit: number = 20, offset: number = 0, category?: string, tag?: string): Promise<Note[]> {
    return this.noteRepository.findAll(limit, offset, category, tag);
  }
}
