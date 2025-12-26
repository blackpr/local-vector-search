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
    const newNote: NewNote = { text, category };
    return this.noteRepository.save(newNote, embedding);
  }
}
