import { useEffect, useRef, useState, useCallback } from 'react';
import type { WorkerResponse } from '../worker';

export function useWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ text: string; category: string; distance: number }>>([]);
  const [allNotes, setAllNotes] = useState<Array<{ id: number; text: string; category: string; created_at: string }>>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<{ file: string; progress: number; loaded: number; total: number } | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setStatus('loading');

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type } = e.data;

      if (type === 'READY') {
        setStatus('ready');
        setProgress(null);
      } else if (type === 'NOTE_ADDED') {
        setIsIndexing(false);
        // Refresh list if needed
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
      } else if (type === 'PROGRESS') {
        const payload = (e.data as any).payload;
        // Transformers.js progress format
        if (payload.status === 'progress') {
          setProgress({
            file: payload.file,
            progress: payload.progress, // 0-100
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

  const addNote = useCallback((text: string, category: string) => {
    setIsIndexing(true);
    workerRef.current?.postMessage({ type: 'ADD_NOTE', payload: { text, category } });
  }, []);

  const search = useCallback((query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    workerRef.current?.postMessage({ type: 'SEARCH', payload: query });
  }, []);

  const listNotes = useCallback(() => {
    workerRef.current?.postMessage({ type: 'LIST_NOTES' });
  }, []);

  const deleteNote = useCallback((id: number) => {
    workerRef.current?.postMessage({ type: 'DELETE_NOTE', payload: id });
  }, []);

  return { status, error, searchResults, allNotes, addNote, search, listNotes, deleteNote, isIndexing, progress };
}
