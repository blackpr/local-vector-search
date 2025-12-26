import type { Note, NewNote } from './Note';

export interface NoteRepository {
  save(note: NewNote, embedding?: Float32Array): Promise<Note>;
  delete(id: number): Promise<void>;
  update(note: Note): Promise<void>;
  findAll(limit?: number, offset?: number, category?: string, tag?: string, pinned?: boolean): Promise<Note[]>;
  exportAll(): Promise<Note[]>;
  merge(importedNotes: Note[], embeddingService: { generateEmbedding: (text: string) => Promise<Float32Array> }): Promise<{ imported: number; updated: number }>;
  exportDatabase?(): Promise<Blob>;
  findById(id: number): Promise<Note | null>;
}
