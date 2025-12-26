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
  | { type: 'DELETE_NOTE'; payload: number }
  | { type: 'EXPORT' }
  | { type: 'IMPORT'; payload: any };

export type WorkerResponse =
  | { type: 'READY' }
  | { type: 'NOTE_ADDED'; text: string }
  | { type: 'SEARCH_RESULTS'; results: Array<{ text: string; category: string; distance: number }> }
  | { type: 'NOTES_LISTED'; results: Array<{ id: number; text: string; category: string; created_at: string }> }
  | { type: 'NOTE_DELETED'; id: number }
  | { type: 'EXPORT_RESULT'; payload: any }
  | { type: 'IMPORT_RESULT'; payload: { imported: number; updated: number } }
  | { type: 'ERROR'; error: string }
  | { type: 'PROGRESS'; payload: any };

// Global dependency instances
let addNoteUseCase: AddNoteUseCase;
let searchNotesUseCase: SearchNotesUseCase;
let listNotesUseCase: ListNotesUseCase;
let deleteNoteUseCase: DeleteNoteUseCase;
let noteRepository: SqliteNoteRepository;
let vectorService: TransformersVectorService;

async function initialize() {
  try {
    // 1. Initialize Infrastructure
    vectorService = new TransformersVectorService((data) => {
      self.postMessage({ type: 'PROGRESS', payload: data });
    });
    // Start model loading immediately
    const modelInitPromise = vectorService.initialize();

    const db = await DatabaseFactory.createDatabase();
    noteRepository = new SqliteNoteRepository(db);

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
      self.postMessage({ type: 'SEARCH_RESULTS', results: results as any });
    } else if (type === 'LIST_NOTES') {
      if (!listNotesUseCase) throw new Error('Not initialized');
      const results = await listNotesUseCase.execute();
      const mappedResults = results.map(r => ({
        ...r,
        created_at: r.createdAt
      }));
      self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any });
    } else if (type === 'DELETE_NOTE') {
      if (!deleteNoteUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await deleteNoteUseCase.execute(payload);
      self.postMessage({ type: 'NOTE_DELETED', id: payload });
    } else if (type === 'EXPORT') {
      if (!noteRepository) throw new Error('Not initialized');
      const results = await noteRepository.exportAll();
      self.postMessage({ type: 'EXPORT_RESULT', payload: results });
    } else if (type === 'IMPORT') {
      if (!noteRepository) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const result = await noteRepository.merge(payload, vectorService);
      self.postMessage({ type: 'IMPORT_RESULT', payload: result });
      // Helper refresh
      const notes = await listNotesUseCase.execute();
      const mappedResults = notes.map(r => ({ ...r, created_at: r.createdAt }));
      self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
};
