// @ts-ignore
import initSQLite from '../vendor/sqlite3.mjs';

export class DatabaseFactory {
  static async createDatabase(): Promise<any> {
    try {
      const sqlite3 = await initSQLite({
        print: console.log,
        printErr: console.error,
      });

      let db: any;

      // Robust OPFS check
      const isSecure = typeof self !== 'undefined' && self.crossOriginIsolated;
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

      console.log(`DB Factory: Secure = ${isSecure}, SAB = ${hasSharedArrayBuffer} `);

      try {
        if (isSecure && hasSharedArrayBuffer && 'opfs' in sqlite3) {
          db = new sqlite3.oo1.OpfsDb('/notes.db');
          console.log('Using OPFS storage');
        } else {
          throw new Error('OPFS requirements not met');
        }
      } catch (opfsError) {
        console.warn('OPFS init failed/unavailable, falling back to memory:', opfsError);
        db = new sqlite3.oo1.DB(':memory:');
        console.log('Using in-memory storage');
      }

      return db;
    } catch (criticalError) {
      console.error("Critical SQLite Init Error:", criticalError);
      throw criticalError;
    }
  }
}
