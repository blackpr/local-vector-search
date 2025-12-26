import type { Note, NewNote } from './Note';

export interface NoteRepository {
  save(note: NewNote, embedding?: Float32Array): Promise<Note>;
  delete(id: number): Promise<void>;
  findAll(): Promise<Note[]>;
}
