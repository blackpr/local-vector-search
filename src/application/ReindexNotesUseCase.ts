import type { NoteRepository } from '../domain/NoteRepository';
import type { VectorService } from '../domain/VectorService';

/**
 * Stored vectors are only comparable with query vectors from the same model
 * and weight precision. When that changes, re-embed everything once.
 */
export class ReindexNotesUseCase {
  private readonly noteRepository: NoteRepository;
  private readonly vectorService: VectorService;

  constructor(noteRepository: NoteRepository, vectorService: VectorService) {
    this.noteRepository = noteRepository;
    this.vectorService = vectorService;
  }

  async execute(onProgress?: (done: number, total: number) => void): Promise<number> {
    const current = this.vectorService.version;
    const stored = await this.noteRepository.getEmbeddingVersion();
    if (stored === current) return 0;

    const notes = await this.noteRepository.listAllForReindex();
    let done = 0;
    for (const note of notes) {
      const embedding = await this.vectorService.generateEmbedding(note.text);
      await this.noteRepository.replaceEmbedding(note.id, embedding);
      done++;
      onProgress?.(done, notes.length);
    }

    await this.noteRepository.setEmbeddingVersion(current);
    return done;
  }
}
