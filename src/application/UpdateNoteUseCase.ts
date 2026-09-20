import type { NoteRepository } from '../domain/NoteRepository';
import type { VectorService } from '../domain/VectorService';
import type { Note } from '../domain/Note';

export class UpdateNoteUseCase {
  private readonly noteRepository: NoteRepository;
  private readonly vectorService: VectorService;

  constructor(noteRepository: NoteRepository, vectorService: VectorService) {
    this.noteRepository = noteRepository;
    this.vectorService = vectorService;
  }

  async execute(note: Note): Promise<void> {
    const existing = await this.noteRepository.findById(note.id);
    if (!existing) throw new Error(`Note ${note.id} not found`);

    // The vector is derived from the text. Only recompute it when the text
    // changed (pinning or re-tagging a note should stay instant), and compute
    // it BEFORE writing so a failed embedding leaves the old, consistent pair.
    const textChanged = existing.text !== note.text;
    const embedding = textChanged
      ? await this.vectorService.generateEmbedding(note.text)
      : undefined;

    // The editor sends no pin state; don't let an edit silently unpin a note.
    const isPinned = note.isPinned ?? existing.isPinned;

    await this.noteRepository.update({ ...note, isPinned }, embedding);
  }
}
