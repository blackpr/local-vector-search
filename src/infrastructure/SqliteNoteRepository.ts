import type { Note, NewNote } from '../domain/Note';
import type { NoteRepository } from '../domain/NoteRepository';
import type { SearchService, SearchResult } from '../domain/SearchService';
import type { Category } from '../domain/Category';
import type { CategoryRepository } from '../domain/CategoryRepository';

export class SqliteNoteRepository implements NoteRepository, SearchService, CategoryRepository {
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
      CREATE TABLE IF NOT EXISTS categories(
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notes(
        rowid INTEGER PRIMARY KEY,
        text TEXT,
        category TEXT, -- Legacy column
        category_id INTEGER,
        tags TEXT, -- JSON array of strings
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        uuid TEXT UNIQUE,
        FOREIGN KEY(category_id) REFERENCES categories(id)
      );
    `);

    // Migrations
    const columns = this.db.selectObjects('PRAGMA table_info(notes)');
    const hasUuid = columns.some((c: any) => c.name === 'uuid');
    const hasUpdatedAt = columns.some((c: any) => c.name === 'updated_at');
    const hasCategoryId = columns.some((c: any) => c.name === 'category_id');
    const hasTags = columns.some((c: any) => c.name === 'tags');

    if (!hasUuid) this.db.exec('ALTER TABLE notes ADD COLUMN uuid TEXT');
    if (!hasUpdatedAt) this.db.exec('ALTER TABLE notes ADD COLUMN updated_at DATETIME');
    if (!hasTags) this.db.exec('ALTER TABLE notes ADD COLUMN tags TEXT');

    if (!hasCategoryId) {
      console.log('Migrating: Adding category_id column to notes table');
      this.db.exec('ALTER TABLE notes ADD COLUMN category_id INTEGER REFERENCES categories(id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id)');

      // Populate categories from existing text
      this.db.exec(`
            INSERT OR IGNORE INTO categories(name) 
            SELECT DISTINCT category FROM notes WHERE category IS NOT NULL;
        `);

      // Backfill category_id
      this.db.exec(`
            UPDATE notes 
            SET category_id = (SELECT id FROM categories WHERE categories.name = notes.category)
            WHERE category IS NOT NULL AND category_id IS NULL;
        `);
    }

    // Backfill UUIDs and indexes...
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
    }

    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_uuid ON notes(uuid)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id)');
  }

  // ... (CategoryRepository impl unchanged)

  async findAllCategories(): Promise<Category[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = this.db.selectObjects('SELECT id, name FROM categories ORDER BY name ASC');
    return rows as Category[];
  }

  async create(name: string): Promise<Category> {
    if (!this.db) throw new Error('Database not initialized');
    const existing = this.db.selectObject('SELECT id, name FROM categories WHERE name = ?', [name]);
    if (existing) return existing as Category;

    this.db.exec({
      sql: 'INSERT INTO categories(name) VALUES (?)',
      bind: [name]
    });
    const id = this.db.selectValue('SELECT last_insert_rowid()');
    return { id, name };
  }

  async deleteCategory(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.exec({ sql: 'DELETE FROM categories WHERE id = ?', bind: [id] });
  }

  // NoteRepository.delete
  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.transaction(() => {
      this.db.exec({ sql: 'DELETE FROM notes WHERE rowid = ?', bind: [id] });
      this.db.exec({ sql: 'DELETE FROM vec_notes WHERE rowid = ?', bind: [id] });
    });
  }

  async findById(id: number): Promise<Note | null> {
    if (!this.db) throw new Error('Database not initialized');
    const row = this.db.selectObject(
      'SELECT rowid as id, uuid, text, category, tags, created_at, updated_at FROM notes WHERE rowid = ?',
      [id]
    ) as any;

    if (!row) return null;

    let tags: string[] = [];
    try {
      tags = row.tags ? JSON.parse(row.tags) : [];
    } catch (e) { /* ignore */ }

    return {
      id: row.id,
      uuid: row.uuid,
      text: row.text,
      category: row.category,
      tags,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // --- NoteRepository Implementation ---

  private toSqliteBlob(vector: any): Uint8Array {
    if (vector instanceof Float32Array) {
      return new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
    }
    return vector;
  }

  async save(note: NewNote, embedding?: Float32Array): Promise<Note> {
    if (!this.db) throw new Error('Database not initialized');
    if (!embedding) throw new Error('Embedding is required');

    let rowId: number = 0;
    const uuid = note.uuid || crypto.randomUUID();
    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(note.tags || []);

    this.db.transaction(() => {
      let categoryId: number | null = null;
      if (note.category) {
        this.db.exec({ sql: 'INSERT OR IGNORE INTO categories(name) VALUES (?)', bind: [note.category] });
        const catResult = this.db.selectObject('SELECT id FROM categories WHERE name = ?', [note.category]);
        categoryId = catResult ? catResult.id : null;
      }

      this.db.exec({
        sql: 'INSERT INTO notes(uuid, text, category, category_id, tags, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        bind: [uuid, note.text, note.category, categoryId, tagsJson, now],
      });

      rowId = this.db.selectValue('SELECT last_insert_rowid()');

      const stmt = this.db.prepare('INSERT INTO vec_notes(rowid, embedding) VALUES (?, ?)');
      try {
        stmt.bind([rowId, this.toSqliteBlob(embedding)]);
        stmt.step();
      } finally {
        stmt.finalize();
      }
    });

    return {
      id: rowId,
      uuid,
      text: note.text,
      category: note.category,
      tags: note.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(now),
    };
  }

  async update(note: Note): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(note.tags || []);

    // 1. Ensure Category exists
    let categoryId: number | null = null;
    if (note.category) {
      this.db.exec({
        sql: 'INSERT OR IGNORE INTO categories(name) VALUES (?)',
        bind: [note.category]
      });
      const catResult = this.db.selectObject('SELECT id FROM categories WHERE name = ?', [note.category]);
      categoryId = catResult ? catResult.id : null;
    }

    // 2. Update Note
    this.db.exec({
      sql: `UPDATE notes SET text = ?, category = ?, category_id = ?, tags = ?, updated_at = ? WHERE rowid = ?`,
      bind: [note.text, note.category, categoryId, tagsJson, now, note.id]
    });
  }

  async findAll(limit: number = 20, offset: number = 0, category?: string, tag?: string): Promise<Note[]> {
    if (!this.db) throw new Error('Database not initialized');
    const results: Note[] = [];

    let sql = 'SELECT rowid as id, uuid, text, category, tags, created_at, updated_at FROM notes';
    const conditions: string[] = [];
    const bind: any[] = [];

    if (category) {
      conditions.push('category = ?');
      bind.push(category);
    }

    if (tag) {
      // Simple JSON array search using LIKE
      // This matches "tag", "tag", ... or ["tag"] patterns in the JSON string
      conditions.push('tags LIKE ?');
      bind.push(`%"${tag}"%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bind.push(limit, offset);

    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(bind as any[]);
      while (stmt.step()) {
        const row = stmt.get({}) as any;
        let tags: string[] = [];
        try {
          tags = row.tags ? JSON.parse(row.tags) : [];
        } catch (e) { /* ignore */ }

        results.push({
          id: row.id,
          uuid: row.uuid,
          text: row.text,
          category: row.category,
          tags,
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
    if (!this.db) throw new Error('Database not initialized');
    const results: Note[] = [];
    const stmt = this.db.prepare('SELECT rowid as id, uuid, text, category, tags, created_at, updated_at FROM notes ORDER BY created_at DESC');
    try {
      while (stmt.step()) {
        const row = stmt.get({}) as any;
        let tags: string[] = [];
        try {
          tags = row.tags ? JSON.parse(row.tags) : [];
        } catch (e) { /* ignore */ }

        results.push({
          id: row.id,
          uuid: row.uuid,
          text: row.text,
          category: row.category,
          tags,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        });
      }
    } finally {
      stmt.finalize();
    }
    return results;
  }

  async exportDatabase(): Promise<Blob> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      try {
        const byteArray = this.db.export();
        return new Blob([byteArray], { type: 'application/x-sqlite3' });
      } catch (innerErr) {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle('notes.db');
        const file = await fileHandle.getFile();
        return file;
      }
    } catch (e) {
      console.error('Failed to export raw DB:', e);
      throw new Error('Current database configuration does not support raw export');
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
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
        const embedding = await embeddingService.generateEmbedding(importedNote.text);
        await this.save({
          uuid: importedNote.uuid,
          text: importedNote.text,
          category: importedNote.category,
          tags: importedNote.tags
        }, embedding);

        this.db.exec({
          sql: 'UPDATE notes SET created_at = ?, updated_at = ? WHERE uuid = ?',
          bind: [importedNote.createdAt, importedNote.updatedAt, importedNote.uuid]
        });
        importedCount++;
      } else {
        const localUpdated = new Date(existing.updated_at).getTime();
        const remoteUpdated = new Date(importedNote.updatedAt).getTime();

        if (remoteUpdated > localUpdated) {
          const needsEmbeddingUpdate = existing.text !== importedNote.text;

          this.db.transaction(() => {
            let categoryId: number | null = null;
            if (importedNote.category) {
              this.db.exec({ sql: 'INSERT OR IGNORE INTO categories(name) VALUES (?)', bind: [importedNote.category] });
              const catResult = this.db.selectObject('SELECT id FROM categories WHERE name = ?', [importedNote.category]);
              categoryId = catResult ? catResult.id : null;
            }

            this.db.exec({
              sql: 'UPDATE notes SET text = ?, category = ?, category_id = ?, tags = ?, updated_at = ? WHERE uuid = ?',
              bind: [importedNote.text, importedNote.category, categoryId, JSON.stringify(importedNote.tags || []), importedNote.updatedAt, importedNote.uuid]
            });
          });

          if (needsEmbeddingUpdate) {
            const embedding = await embeddingService.generateEmbedding(importedNote.text);
            const rowId = existing.rowid;
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

  async search(_query: string, limit: number = 20, offset: number = 0, queryEmbedding?: Float32Array): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (!queryEmbedding) throw new Error('Query embedding is required');

    const sql = `
      SELECT 
        notes.rowid as id,
        notes.uuid,
        notes.text, 
        notes.category, 
        notes.tags,
        notes.created_at,
        notes.updated_at,
        vec_distance_L2(vec_notes.embedding, ?) as distance 
      FROM vec_notes 
      LEFT JOIN notes ON vec_notes.rowid = notes.rowid
      ORDER BY distance ASC 
      LIMIT ? OFFSET ?
    `;

    const stmt = this.db.prepare(sql);
    const results: SearchResult[] = [];

    try {
      stmt.bind([this.toSqliteBlob(queryEmbedding), limit, offset]);
      while (stmt.step()) {
        const row = stmt.get({}) as any;
        if (row.distance < 1.0) {
          let tags: string[] = [];
          try { tags = row.tags ? JSON.parse(row.tags) : []; } catch (e) { }

          results.push({
            id: row.id,
            uuid: row.uuid,
            text: row.text,
            category: row.category,
            tags,
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
