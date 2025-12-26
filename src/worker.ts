import { AddNoteUseCase } from './application/AddNoteUseCase';
import { DeleteNoteUseCase } from './application/DeleteNoteUseCase';
import { ListNotesUseCase } from './application/ListNotesUseCase';
import { SearchNotesUseCase } from './application/SearchNotesUseCase';
import { DatabaseFactory } from './infrastructure/DatabaseFactories';
import { SqliteNoteRepository } from './infrastructure/SqliteNoteRepository';
import { TransformersVectorService } from './infrastructure/TransformersVectorService';

// Define types for messages (Keep consistent with frontend)
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
  | { type: 'NOTES_LISTED'; results: Array<{ id: number; text: string; category: string; created_at: string }> } // Note: createdAt vs created_at
  | { type: 'NOTE_DELETED'; id: number }
  | { type: 'ERROR'; error: string }
  | { type: 'PROGRESS'; payload: any };

// Global dependency instances
let addNoteUseCase: AddNoteUseCase;
let searchNotesUseCase: SearchNotesUseCase;
let listNotesUseCase: ListNotesUseCase;
let deleteNoteUseCase: DeleteNoteUseCase;

async function initialize() {
  try {
    // 1. Initialize Infrastructure
    const vectorService = new TransformersVectorService((data) => {
      self.postMessage({ type: 'PROGRESS', payload: data });
    });
    // Start model loading immediately
    const modelInitPromise = vectorService.initialize();

    const db = await DatabaseFactory.createDatabase();
    const noteRepository = new SqliteNoteRepository(db);

    await modelInitPromise;

    // 2. Initialize Application Layer
    addNoteUseCase = new AddNoteUseCase(noteRepository, vectorService);
    searchNotesUseCase = new SearchNotesUseCase(noteRepository, vectorService);
    listNotesUseCase = new ListNotesUseCase(noteRepository);
    deleteNoteUseCase = new DeleteNoteUseCase(noteRepository);

    console.log('System Ready.');
    self.postMessage({ type: 'READY' });
  } catch (error) {
    console.error('Initialization error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  try {
    if (type === 'INIT') {
      await initialize();
    } else if (type === 'ADD_NOTE') {
      if (!addNoteUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await addNoteUseCase.execute(payload.text, payload.category);
      self.postMessage({ type: 'NOTE_ADDED', text: payload.text });
    } else if (type === 'SEARCH') {
      if (!searchNotesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const results = await searchNotesUseCase.execute(payload);
      // Map Domain results to Worker response format
      // Domain might return Date object, we might want to serialize it or keep it as is?
      // Worker transfer usually clones objects. Date objects are cloneable.
      // But verify if frontend expects string or Date. Frontend logic handles new Date(note.created_at).
      self.postMessage({ type: 'SEARCH_RESULTS', results: results as any });
    } else if (type === 'LIST_NOTES') {
      if (!listNotesUseCase) throw new Error('Not initialized');
      const results = await listNotesUseCase.execute();

      // Transform keys if necessary. Domain uses 'createdAt', Worker response interface says 'created_at'
      // The SqliteRepo currently returns objects with 'createdAt'.
      // The frontend expects 'created_at' (or 'createdAt' - I handled both in NoteList, but existing types in App.tsx/worker.ts said 'created_at').
      // Let's map it to ensure compatibility with existing Frontend expectations if we want to be safe, 
      // OR update the frontend types. I updated NoteList to handle both.
      // But useWorker hook has types too?
      // I should ideally standardize on camelCase 'createdAt' but for now adapting to snake_case might be safer for legacy or just emit what I have.
      // My SqliteNoteRepository returns 'createdAt'.
      // Let's map it.
      const mappedResults = results.map(r => ({
        ...r,
        created_at: r.createdAt // Compatibility
      }));

      self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any });
    } else if (type === 'DELETE_NOTE') {
      if (!deleteNoteUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await deleteNoteUseCase.execute(payload);
      self.postMessage({ type: 'NOTE_DELETED', id: payload });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
};
