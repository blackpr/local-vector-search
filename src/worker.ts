import { pipeline, FeatureExtractionPipeline } from '@huggingface/transformers';
// Import SQLite statically so Vite can bundle/process it
// @ts-ignore
import initSQLite from './vendor/sqlite3.mjs';

// Define types for messages
export type WorkerMessage =
  | { type: 'INIT' }
  | { type: 'ADD_NOTE'; payload: { text: string; category: string } }
  | { type: 'SEARCH'; payload: string }
  | { type: 'LIST_NOTES' }
  | { type: 'DELETE_NOTE'; payload: number };

export type WorkerResponse =
  | { type: 'READY' }
  | { type: 'NOTE_ADDED'; text: string }
  | { type: 'SEARCH_RESULTS'; results: Array<{ text: string; category: string; distance: number }> }
  | { type: 'NOTES_LISTED'; results: Array<{ id: number; text: string; category: string; created_at: string }> }
  | { type: 'NOTE_DELETED'; id: number }
  | { type: 'ERROR'; error: string }
  | { type: 'PROGRESS'; payload: any };

const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';

let db: any;
let classifier: FeatureExtractionPipeline | null = null;

// Initialize the AI and DB
async function initialize() {
  try {
    // A. Load the AI Model
    console.log('Loading AI Model...');
    // @ts-ignore - types can be complex
    classifier = await pipeline('feature-extraction', MODEL_ID, {
      device: 'webgpu', // Uses WebGPU if available, falls back to WASM
      dtype: 'fp32',    // SQLite expects float32
      progress_callback: (data: any) => {
        self.postMessage({ type: 'PROGRESS', payload: data });
      }
    });

    // B. Load the Database
    console.log('Loading SQLite...');

    const sqlite3 = await initSQLite({
      print: console.log,
      printErr: console.error,
    });

    // Use OPFS if available, otherwise memory
    try {
      // Fix for OPFS: Check if shared array buffer is available
      if ('opfs' in sqlite3 && typeof SharedArrayBuffer !== 'undefined') {
        db = new sqlite3.oo1.OpfsDb('/notes.db');
        console.log('Using OPFS storage');
      } else {
        db = new sqlite3.oo1.DB(':memory:');
        console.log('Using in-memory storage (OPFS unavailable)');
      }
    } catch (e) {
      console.warn('OPFS failed, falling back to memory', e);
      db = new sqlite3.oo1.DB(':memory:');
    }

    // C. Create tables
    db.exec(`
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

    console.log('System Ready.');
    self.postMessage({ type: 'READY' });
  } catch (error) {
    console.error('Initialization error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
}
// ... rest of file ...
// Helper: Generate Embedding
async function getEmbedding(text: string, isQuery = false) {
  if (!classifier) throw new Error('Classifier not initialized');

  // EmbeddingGemma requires specific prompts
  const prefix = isQuery
    ? 'task: search result | query: '
    : 'title: none | text: ';

  const output = await classifier(prefix + text, { pooling: 'mean', normalize: true });
  return output.data; // Returns Float32Array
}

// Helper: Convert Float32Array to Uint8Array for SQLite BLOB binding
function toSqliteBlob(vector: any): Uint8Array {
  if (vector instanceof Float32Array) {
    return new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
  }
  return vector;
}

// Helper: Insert a Note
async function addNote(text: string, category: string) {
  if (!db) throw new Error('Database not initialized');

  const embedding = await getEmbedding(text, false);

  // Transaction to ensure data integrity
  db.transaction(() => {
    // 1. Insert actual text into normal table
    db.exec({
      sql: 'INSERT INTO notes(text, category) VALUES (?, ?)',
      bind: [text, category]
    });

    const rowId = db.selectValue('SELECT last_insert_rowid()');

    // 2. Insert vector into vector table
    // We use a prepared statement for the vector insert
    const stmt = db.prepare('INSERT INTO vec_notes(rowid, embedding) VALUES (?, ?)');
    try {
      // SQLite WASM bind expects an array for positional arguments
      stmt.bind([rowId, toSqliteBlob(embedding)]);
      stmt.step();
    } finally {
      stmt.finalize();
    }
  });

  return true;
}

// Helper: Search
async function search(query: string) {
  if (!db) throw new Error('Database not initialized');

  const queryVector = await getEmbedding(query, true);

  // Perform Vector Search
  const sql = `
    SELECT 
      notes.text, 
      notes.category, 
      vec_distance_L2(vec_notes.embedding, ?) as distance 
    FROM vec_notes 
    LEFT JOIN notes ON vec_notes.rowid = notes.rowid
    ORDER BY distance ASC 
    LIMIT 10
  `;

  const stmt = db.prepare(sql);
  const results: any[] = [];

  try {
    stmt.bind([toSqliteBlob(queryVector)]);

    while (stmt.step()) {
      const row = stmt.get({}) as any; // Get as object
      // Filter out results with poor matching score (distance >= 1.0 means score <= 0%)
      if (row.distance < 1.0) {
        results.push(row);
      }
    }
  } finally {
    stmt.finalize();
  }

  return results;
}

// Helper: List all Notes
async function listNotes() {
  if (!db) throw new Error('Database not initialized');

  const results: any[] = [];

  // Use generic select loop
  const stmt = db.prepare('SELECT rowid as id, text, category, created_at FROM notes ORDER BY created_at DESC');
  try {
    while (stmt.step()) {
      results.push(stmt.get({}));
    }
  } finally {
    stmt.finalize();
  }

  return results;
}

// Helper: Delete a Note
async function deleteNote(id: number) {
  if (!db) throw new Error('Database not initialized');

  db.transaction(() => {
    db.exec({
      sql: 'DELETE FROM notes WHERE rowid = ?',
      bind: [id]
    });
    db.exec({
      sql: 'DELETE FROM vec_notes WHERE rowid = ?',
      bind: [id]
    });
  });
  return true;
}

// Message Handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  try {
    if (type === 'INIT') {
      await initialize();
    } else if (type === 'ADD_NOTE') {
      const payload = (e.data as any).payload;
      await addNote(payload.text, payload.category);
      self.postMessage({ type: 'NOTE_ADDED', text: payload.text });
    } else if (type === 'SEARCH') {
      const payload = (e.data as any).payload;
      const results = await search(payload);
      self.postMessage({ type: 'SEARCH_RESULTS', results });
    } else if (type === 'LIST_NOTES') {
      const results = await listNotes();
      self.postMessage({ type: 'NOTES_LISTED', results });
    } else if (type === 'DELETE_NOTE') {
      const payload = (e.data as any).payload;
      await deleteNote(payload);
      self.postMessage({ type: 'NOTE_DELETED', id: payload });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
};
