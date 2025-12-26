import { useEffect, useRef, useState, useCallback } from 'react';
import type { WorkerResponse } from '../app.worker';

export function useWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ id: number; text: string; category: string; created_at: string | Date; tags?: string[]; distance: number }>>([]);
  const [allNotes, setAllNotes] = useState<Array<{ id: number; text: string; category: string; created_at: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<{ file: string; progress: number; loaded: number; total: number } | null>(null);

  useEffect(() => {
    const workerUrl = new URL('../app.worker.ts', import.meta.url);
    console.log("Initializing Worker from:", workerUrl.toString());
    const worker = new Worker(workerUrl, { type: 'module' });
    workerRef.current = worker;
    setStatus('loading');

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type } = e.data;

      if (type === 'READY') {
        setStatus('ready');
        setProgress(null);
      } else if (type === 'NOTE_ADDED') {
        setIsIndexing(false);
        worker.postMessage({ type: 'LIST_NOTES' });
      } else if (type === 'NOTE_UPDATED') {
        worker.postMessage({ type: 'LIST_NOTES' });
      } else if (type === 'SEARCH_RESULTS') {
        setSearchResults((e.data as any).results);
      } else if (type === 'NOTES_LISTED') {
        setAllNotes((e.data as any).results);
      } else if (type === 'NOTE_DELETED') {
        const id = (e.data as any).id;
        setAllNotes(prev => prev.filter(note => note.id !== id));
      } else if (type === 'ERROR') {
        setStatus('error');
        setError((e.data as any).error);
        setIsIndexing(false);
        setProgress(null);
      } else if (type === 'CATEGORIES_LISTED') {
        setCategories((e.data as any).results);
      } else if (type === 'CATEGORY_ADDED') {
        worker.postMessage({ type: 'LIST_CATEGORIES' });
      } else if (type === 'CATEGORY_DELETED') {
        worker.postMessage({ type: 'LIST_CATEGORIES' });
      } else if (type === 'PROGRESS') {
        const payload = (e.data as any).payload;
        if (payload.status === 'progress') {
          setProgress({
            file: payload.file,
            progress: payload.progress,
            loaded: payload.loaded,
            total: payload.total
          });
        }
      }
    };

    worker.postMessage({ type: 'INIT' });

    return () => {
      worker.terminate();
    };
  }, []);

  const addNote = useCallback((text: string, category: string, tags: string[]) => {
    setIsIndexing(true);
    workerRef.current?.postMessage({ type: 'ADD_NOTE', payload: { text, category, tags } });
  }, []);

  const search = useCallback((query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    workerRef.current?.postMessage({ type: 'SEARCH', payload: query });
  }, []);

  const listNotes = useCallback((limit: number = 20, offset: number = 0, category?: string, tag?: string) => {
    workerRef.current?.postMessage({ type: 'LIST_NOTES', payload: { limit, offset, category, tag } });
  }, []);

  const suggestCategory = useCallback((text: string) => {
    return new Promise<string | null>((resolve) => {
      if (!workerRef.current) return resolve(null);
      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'CATEGORY_SUGGESTED') {
          workerRef.current?.removeEventListener('message', handler);
          resolve(e.data.result);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'SUGGEST_CATEGORY', payload: text });
    });
  }, []);

  const deleteNote = useCallback((id: number) => {
    workerRef.current?.postMessage({ type: 'DELETE_NOTE', payload: id });
  }, []);

  const updateNote = useCallback((id: number, text: string, category: string, tags: string[] = []) => {
    workerRef.current?.postMessage({ type: 'UPDATE_NOTE', payload: { id, text, category, tags } });
  }, []);

  const listCategories = useCallback(() => {
    workerRef.current?.postMessage({ type: 'LIST_CATEGORIES' });
  }, []);

  const addCategory = useCallback((name: string) => {
    workerRef.current?.postMessage({ type: 'ADD_CATEGORY', payload: name });
  }, []);

  const deleteCategory = useCallback((id: number) => {
    workerRef.current?.postMessage({ type: 'DELETE_CATEGORY', payload: id });
  }, []);

  // Sync methods (Promise-based wrappers)
  const exportNotes = useCallback(() => {
    return new Promise<any[]>((resolve, reject) => {
      if (!workerRef.current) return reject('Worker not ready');

      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'EXPORT_RESULT') {
          workerRef.current?.removeEventListener('message', handler);
          resolve((e.data as any).payload);
        } else if (e.data.type === 'ERROR') {
          workerRef.current?.removeEventListener('message', handler);
          reject(e.data.error);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'EXPORT' });
    });
  }, []);

  const exportDatabase = useCallback(() => {
    return new Promise<Blob>((resolve, reject) => {
      if (!workerRef.current) return reject('Worker not ready');

      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'EXPORT_DB_RESULT') {
          workerRef.current?.removeEventListener('message', handler);
          resolve((e.data as any).payload);
        } else if (e.data.type === 'ERROR') {
          workerRef.current?.removeEventListener('message', handler);
          reject(e.data.error);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'EXPORT_DB' });
    });
  }, []);

  const importNotes = useCallback((notes: any[]) => {
    return new Promise<{ imported: number; updated: number }>((resolve, reject) => {
      if (!workerRef.current) return reject('Worker not ready');
      setIsIndexing(true); // Importing involves embedding

      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'IMPORT_RESULT') {
          workerRef.current?.removeEventListener('message', handler);
          resolve((e.data as any).payload);
        } else if (e.data.type === 'ERROR') {
          workerRef.current?.removeEventListener('message', handler);
          reject(e.data.error);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'IMPORT', payload: notes });
    });
  }, []);

  const importDatabase = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      if (!workerRef.current) return reject('Worker not ready');

      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'IMPORT_DB_RESULT') {
          workerRef.current?.removeEventListener('message', handler);
          resolve();
        } else if (e.data.type === 'ERROR') {
          workerRef.current?.removeEventListener('message', handler);
          reject(e.data.error);
        }
      };

      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'IMPORT_DB', payload: file });
    });
  }, []);

  const generateTags = useCallback((text: string) => {
    return new Promise<string[]>((resolve) => {
      if (!workerRef.current) return resolve([]);
      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'TAGS_GENERATED') {
          workerRef.current?.removeEventListener('message', handler);
          resolve(e.data.result);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'GENERATE_TAGS', payload: text });
    });
  }, []);

  const getNote = useCallback((id: number) => {
    return new Promise<{ id: number; text: string; category: string; created_at: string; tags: string[] } | null>((resolve) => {
      if (!workerRef.current) return resolve(null);
      const handler = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === 'NOTE_FOUND') {
          workerRef.current?.removeEventListener('message', handler);
          resolve(e.data.result as any);
        }
      };
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type: 'GET_NOTE', payload: id });
    });
  }, []);

  return { status, error, searchResults, allNotes, categories, addNote, search, listNotes, deleteNote, updateNote, listCategories, addCategory, deleteCategory, isIndexing, progress, exportNotes, exportDatabase, importNotes, importDatabase, suggestCategory, generateTags, getNote };
}
