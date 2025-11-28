import { useEffect, useRef, useState, useCallback } from 'react';
import type { WorkerResponse } from '../worker';

export function useWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ text: string; category: string; distance: number }>>([]);
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
      } else if (type === 'SEARCH_RESULTS') {
        setSearchResults((e.data as any).results);
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

  return { status, error, searchResults, addNote, search, isIndexing, progress };
}
