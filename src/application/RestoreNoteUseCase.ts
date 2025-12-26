import type { NoteRepository } from '../domain/NoteRepository';

export class RestoreNoteUseCase {
  private noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  async execute(id: number): Promise<void> {
    return this.noteRepository.restore(id);
  }
}
