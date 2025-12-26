import type { NoteRepository } from '../domain/NoteRepository';
import type { Note } from '../domain/Note';

export class GetNoteUseCase {
  private noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  async execute(id: number): Promise<Note | null> {
    return this.noteRepository.findById(id);
  }
}
