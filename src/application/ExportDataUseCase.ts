import type { NoteRepository } from '../domain/NoteRepository';
import type { Note } from '../domain/Note';

export class ExportDataUseCase {
  private readonly noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  async execute(): Promise<Note[]> {
    return this.noteRepository.exportAll();
  }
}
