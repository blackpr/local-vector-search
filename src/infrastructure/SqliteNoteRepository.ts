import type { Note, NewNote } from '../domain/Note';
import type { NoteRepository } from '../domain/NoteRepository';
import type { SearchService, SearchResult } from '../domain/SearchService';

export class SqliteNoteRepository implements NoteRepository, SearchService {
  private db: any;

  constructor(db: any) {
    this.db = db;
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_notes USING vec0(
        embedding float[768]
      );
      CREATE TABLE IF NOT EXISTS notes(
        rowid INTEGER PRIMARY KEY,
        text TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check for new columns and migrate if necessary
    const columns = this.db.selectObjects('PRAGMA table_info(notes)');
    const hasUuid = columns.some((c: any) => c.name === 'uuid');
    const hasUpdatedAt = columns.some((c: any) => c.name === 'updated_at');

    if (!hasUuid) {
      console.log('Migrating: Adding uuid column to notes table');
      this.db.exec('ALTER TABLE notes ADD COLUMN uuid TEXT');
    }

    if (!hasUpdatedAt) {
      console.log('Migrating: Adding updated_at column to notes table');
      this.db.exec('ALTER TABLE notes ADD COLUMN updated_at DATETIME');
    }

    // Migration: Backfill UUIDs for existing notes that might have NULL (from new column addition or legacy)
    const notesWithoutUuid = this.db.selectObjects('SELECT rowid FROM notes WHERE uuid IS NULL');
    if (notesWithoutUuid.length > 0) {
      this.db.transaction(() => {
        for (const note of notesWithoutUuid) {
          this.db.exec({
            sql: 'UPDATE notes SET uuid = ?, updated_at = ? WHERE rowid = ?',
            bind: [crypto.randomUUID(), new Date().toISOString(), note.rowid]
          });
        }
      });
      console.log(`Migrated ${notesWithoutUuid.length} notes with UUIDs`);
    }

    // Ensure Unique Index (Idempotent)
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_uuid ON notes(uuid)');
  }

  // Helper: Convert Float32Array to Uint8Array for SQLite BLOB binding
  private toSqliteBlob(vector: any): Uint8Array {
    if (vector instanceof Float32Array) {
      return new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
    }
    return vector;
  }

  async save(note: NewNote, embedding?: Float32Array): Promise<Note> {
    if (!this.db) throw new Error('Database not initialized');
    if (!embedding) throw new Error('Embedding is required for saving a note');

    let rowId: number = 0;
    const uuid = note.uuid || crypto.randomUUID();
    const now = new Date().toISOString();

    // Transaction to ensure data integrity
    this.db.transaction(() => {
      // 1. Insert actual text into normal table
      this.db.exec({
        sql: 'INSERT INTO notes(uuid, text, category, updated_at) VALUES (?, ?, ?, ?)',
        bind: [uuid, note.text, note.category, now],
      });

      rowId = this.db.selectValue('SELECT last_insert_rowid()');

      // 2. Insert vector into vector table
      const stmt = this.db.prepare('INSERT INTO vec_notes(rowid, embedding) VALUES (?, ?)');
      try {
        stmt.bind([rowId, this.toSqliteBlob(embedding)]);
        stmt.step();
      } finally {
        stmt.finalize();
      }
    });

    // Return the saved note with the generated ID
    return {
      id: rowId,
      uuid,
      text: note.text,
      category: note.category,
      createdAt: new Date(),
      updatedAt: new Date(now),
    };
  }

  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.transaction(() => {
      this.db.exec({
        sql: 'DELETE FROM notes WHERE rowid = ?',
        bind: [id],
      });
      this.db.exec({
        sql: 'DELETE FROM vec_notes WHERE rowid = ?',
        bind: [id],
      });
    });
  }

  async findAll(): Promise<Note[]> {
    if (!this.db) throw new Error('Database not initialized');
    const results: Note[] = [];

    const stmt = this.db.prepare(
      'SELECT rowid as id, uuid, text, category, created_at, updated_at FROM notes ORDER BY created_at DESC'
    );
    try {
      while (stmt.step()) {
        const row = stmt.get({}) as any;
        results.push({
          id: row.id,
          uuid: row.uuid,
          text: row.text,
          category: row.category,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        });
      }
    } finally {
      stmt.finalize();
    }

    return results;
  }

  async exportAll(): Promise<Note[]> {
    return this.findAll();
  }

  async merge(
    importedNotes: Note[],
    embeddingService: { generateEmbedding: (text: string) => Promise<Float32Array> }
  ): Promise<{ imported: number; updated: number }> {
    if (!this.db) throw new Error('Database not initialized');

    let importedCount = 0;
    let updatedCount = 0;

    for (const importedNote of importedNotes) {
      const existing = this.db.selectObject('SELECT rowid, updated_at, text FROM notes WHERE uuid = ?', [importedNote.uuid]);

      if (!existing) {
        // New Note -> Insert
        const embedding = await embeddingService.generateEmbedding(importedNote.text);
        await this.save({
          uuid: importedNote.uuid,
          text: importedNote.text,
          category: importedNote.category
        }, embedding);

        // Fix the timestamps to match imported ones (save() uses 'now')
        this.db.exec({
          sql: 'UPDATE notes SET created_at = ?, updated_at = ? WHERE uuid = ?',
          bind: [importedNote.createdAt, importedNote.updatedAt, importedNote.uuid]
        });
        importedCount++;
      } else {
        // Conflict Resolution: LWW (Last Write Wins)
        const localUpdated = new Date(existing.updated_at).getTime();
        const remoteUpdated = new Date(importedNote.updatedAt).getTime();

        if (remoteUpdated > localUpdated) {
          // Remote is newer -> Update
          const needsEmbeddingUpdate = existing.text !== importedNote.text;

          this.db.transaction(() => {
            this.db.exec({
              sql: 'UPDATE notes SET text = ?, category = ?, updated_at = ? WHERE uuid = ?',
              bind: [importedNote.text, importedNote.category, importedNote.updatedAt, importedNote.uuid]
            });

            if (needsEmbeddingUpdate) {
              // We'll update embedding outside transaction to handle promise, or refactor. 
              // Since transactions in sqlite-wasm are synchronous-ish for the DB lock but logic is async...
              // Actually, we must await embedding before transaction or use a separate step.
            }
          });

          if (needsEmbeddingUpdate) {
            const embedding = await embeddingService.generateEmbedding(importedNote.text);
            const rowId = existing.rowid;
            // Update vector: Delete & Insert (vec0 doesn't support generic UPDATE easily usually, or does it? 
            // vec0 supports DELETE and INSERT. UPDATE is supported in newer versions but DELETE+INSERT is safest.
            this.db.exec('DELETE FROM vec_notes WHERE rowid = ?', [rowId]);
            const stmt = this.db.prepare('INSERT INTO vec_notes(rowid, embedding) VALUES (?, ?)');
            try {
              stmt.bind([rowId, this.toSqliteBlob(embedding)]);
              stmt.step();
            } finally {
              stmt.finalize();
            }
          }
          updatedCount++;
        }
      }
    }
    return { imported: importedCount, updated: updatedCount };
  }

  async search(_query: string, limit: number = 10, queryEmbedding?: Float32Array): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (!queryEmbedding) throw new Error('Query embedding is required for search');

    const sql = `
      SELECT 
        notes.rowid as id,
        notes.uuid,
        notes.text, 
        notes.category, 
        notes.created_at,
        notes.updated_at,
        vec_distance_L2(vec_notes.embedding, ?) as distance 
      FROM vec_notes 
      LEFT JOIN notes ON vec_notes.rowid = notes.rowid
      ORDER BY distance ASC 
      LIMIT ?
    `;

    const stmt = this.db.prepare(sql);
    const results: SearchResult[] = [];

    try {
      stmt.bind([this.toSqliteBlob(queryEmbedding), limit]);

      while (stmt.step()) {
        const row = stmt.get({}) as any;
        // Filter out results with poor matching score (distance >= 1.0 means score <= 0%)
        if (row.distance < 1.0) {
          results.push({
            id: row.id,
            uuid: row.uuid,
            text: row.text,
            category: row.category,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            distance: row.distance,
          });
        }
      }
    } finally {
      stmt.finalize();
    }

    return results;
  }
}
