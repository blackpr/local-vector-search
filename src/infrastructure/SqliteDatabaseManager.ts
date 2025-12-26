import type { DatabaseManager } from '../domain/DatabaseManager';
import { SqliteNoteRepository } from './SqliteNoteRepository';

export class SqliteDatabaseManager implements DatabaseManager {
  private readonly noteRepositoryProvider: () => SqliteNoteRepository | undefined;

  constructor(noteRepositoryProvider: () => SqliteNoteRepository | undefined) {
    this.noteRepositoryProvider = noteRepositoryProvider;
  }

  async exportDatabase(): Promise<Blob> {
    const repo = this.noteRepositoryProvider();
    if (!repo) {
      throw new Error("Repository not initialized");
    }
    if (!repo.exportDatabase) {
      throw new Error("Export not supported by repository");
    }
    return repo.exportDatabase();
  }

  async replaceDatabase(file: File): Promise<void> {
    const repo = this.noteRepositoryProvider();
    // 1. Close existing DB
    if (repo) {
      repo.close();
    }

    // 2. Overwrite OPFS file
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle('notes.db', { create: true });
      // @ts-ignore
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
    } catch (err) {
      console.error("OPFS Import Error", err);
      throw new Error("Failed to overwrite database file. " + err);
    }
  }
}
