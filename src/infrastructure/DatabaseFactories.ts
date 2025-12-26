// @ts-ignore
import initSQLite from '../vendor/sqlite3.mjs';

export class DatabaseFactory {
  static async createDatabase(): Promise<any> {
    const sqlite3 = await initSQLite({
      print: console.log,
      printErr: console.error,
    });

    let db: any;
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

    return db;
  }
}
