import type { NoteRepository } from '../domain/NoteRepository';
import type { Note } from '../domain/Note';

export class UpdateNoteUseCase {
  private readonly noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  async execute(note: Note): Promise<void> {
    await this.noteRepository.update(note);
  }
}
