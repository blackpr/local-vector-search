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

    // Transaction to ensure data integrity
    this.db.transaction(() => {
      // 1. Insert actual text into normal table
      this.db.exec({
        sql: 'INSERT INTO notes(text, category) VALUES (?, ?)',
        bind: [note.text, note.category],
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
      text: note.text,
      category: note.category,
      createdAt: new Date(), // Approximation
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
      'SELECT rowid as id, text, category, created_at FROM notes ORDER BY created_at DESC'
    );
    try {
      while (stmt.step()) {
        const row = stmt.get({}) as any;
        results.push({
          id: row.id,
          text: row.text,
          category: row.category,
          createdAt: new Date(row.created_at),
        });
      }
    } finally {
      stmt.finalize();
    }

    return results;
  }

  async search(_query: string, limit: number = 10, queryEmbedding?: Float32Array): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (!queryEmbedding) throw new Error('Query embedding is required for search');

    const sql = `
      SELECT 
        notes.rowid as id,
        notes.text, 
        notes.category, 
        notes.created_at,
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
            text: row.text,
            category: row.category,
            createdAt: new Date(row.created_at),
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
