import type { NoteRepository } from '../domain/NoteRepository';
import type { VectorService } from '../domain/VectorService';
import type { Note } from '../domain/Note';

export class ImportDataUseCase {
  private readonly noteRepository: NoteRepository;
  private readonly vectorService: VectorService;

  constructor(
    noteRepository: NoteRepository,
    vectorService: VectorService
  ) {
    this.noteRepository = noteRepository;
    this.vectorService = vectorService;
  }

  async execute(importedNotes: Note[]): Promise<{ imported: number; updated: number }> {
    return this.noteRepository.merge(importedNotes, this.vectorService);
  }
}
