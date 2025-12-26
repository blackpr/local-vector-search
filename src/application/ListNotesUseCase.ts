import type { Note } from '../domain/Note';
import type { NoteRepository } from '../domain/NoteRepository';

export class ListNotesUseCase {
  private noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  async execute(): Promise<Note[]> {
    return this.noteRepository.findAll();
  }
}
