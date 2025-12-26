import { AddNoteUseCase } from './application/AddNoteUseCase';
import { DeleteNoteUseCase } from './application/DeleteNoteUseCase';
import { ListNotesUseCase } from './application/ListNotesUseCase';
import { ManageCategoriesUseCase } from './application/ManageCategoriesUseCase';
import { SearchNotesUseCase } from './application/SearchNotesUseCase';
import { GetNoteUseCase } from './application/GetNoteUseCase';
import { DatabaseFactory } from './infrastructure/DatabaseFactories';
import { SqliteNoteRepository } from './infrastructure/SqliteNoteRepository';
import { TransformersVectorService } from './infrastructure/TransformersVectorService';
import { TaggingService } from './infrastructure/TaggingService';

// Define types for messages (Keep consistent with frontend)
export type WorkerMessage =
  | { type: 'INIT' }
  | { type: 'ADD_NOTE'; payload: { text: string; category: string; tags: string[] } }
  | { type: 'SEARCH'; payload: string }
  | { type: 'LIST_NOTES'; payload?: { limit: number; offset: number; category?: string; tag?: string } }
  | { type: 'DELETE_NOTE'; payload: number }
  | { type: 'UPDATE_NOTE'; payload: any }
  | { type: 'LIST_CATEGORIES' }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'DELETE_CATEGORY'; payload: number }
  | { type: 'EXPORT' }
  | { type: 'EXPORT_DB' }
  | { type: 'IMPORT_DB'; payload: File }
  | { type: 'SUGGEST_CATEGORY'; payload: string }
  | { type: 'GENERATE_TAGS'; payload: string }
  | { type: 'IMPORT'; payload: any }
  | { type: 'GET_NOTE'; payload: number };

export type WorkerResponse =
  | { type: 'READY' }
  | { type: 'NOTE_ADDED'; text: string }
  | { type: 'NOTE_UPDATED' }
  | { type: 'SEARCH_RESULTS'; results: Array<{ text: string; category: string; distance: number }> }
  | { type: 'NOTES_LISTED'; results: Array<{ id: number; text: string; category: string; created_at: string }> }
  | { type: 'NOTE_DELETED'; id: number }
  | { type: 'CATEGORIES_LISTED'; results: Array<{ id: number; name: string }> }
  | { type: 'CATEGORY_ADDED'; result: { id: number; name: string } }
  | { type: 'CATEGORY_DELETED'; id: number }
  | { type: 'EXPORT_RESULT'; payload: any }
  | { type: 'EXPORT_DB_RESULT'; payload: Blob }
  | { type: 'IMPORT_RESULT'; payload: { imported: number; updated: number } }
  | { type: 'IMPORT_DB_RESULT' }
  | { type: 'CATEGORY_SUGGESTED'; result: string | null }
  | { type: 'TAGS_GENERATED'; result: string[] }
  | { type: 'ERROR'; error: string }
  | { type: 'NOTE_FOUND'; result: any }
  | { type: 'PROGRESS'; payload: any };

// Global dependency instances
let addNoteUseCase: AddNoteUseCase;
let searchNotesUseCase: SearchNotesUseCase;
let listNotesUseCase: ListNotesUseCase;
let deleteNoteUseCase: DeleteNoteUseCase;
let manageCategoriesUseCase: ManageCategoriesUseCase;
let getNoteUseCase: GetNoteUseCase;
let noteRepository: SqliteNoteRepository;
let vectorService: TransformersVectorService;
let taggingService: TaggingService;

async function initialize() {
  try {
    console.log("Worker: Initializing...");

    // 1. Initialize Infrastructure
    vectorService = new TransformersVectorService((data) => {
      self.postMessage({ type: 'PROGRESS', payload: data });
    });

    // Start model loading immediately
    console.log("Worker: Loading Vector Model...");
    const modelInitPromise = vectorService.initialize().catch(err => {
      throw new Error(`Model Load Failed: ${err.message}`);
    });

    console.log("Worker: Opening DB...");
    const db = await DatabaseFactory.createDatabase().catch(err => {
      throw new Error(`DB Failed: ${err.message}`);
    });
    noteRepository = new SqliteNoteRepository(db);

    console.log("Worker: Waiting for Model...");
    await modelInitPromise;
    console.log("Worker: Model Loaded.");

    // 2. Initialize Application Layer
    addNoteUseCase = new AddNoteUseCase(noteRepository, vectorService);
    searchNotesUseCase = new SearchNotesUseCase(noteRepository, vectorService);
    listNotesUseCase = new ListNotesUseCase(noteRepository);
    deleteNoteUseCase = new DeleteNoteUseCase(noteRepository);
    manageCategoriesUseCase = new ManageCategoriesUseCase(noteRepository);
    getNoteUseCase = new GetNoteUseCase(noteRepository);

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
      await addNoteUseCase.execute(payload.text, payload.category, payload.tags);
      self.postMessage({ type: 'NOTE_ADDED', text: payload.text });
    } else if (type === 'SEARCH') {
      if (!searchNotesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const results = await searchNotesUseCase.execute(payload);
      const mappedResults = results.map(r => ({
        ...r,
        created_at: r.createdAt
      }));
      self.postMessage({ type: 'SEARCH_RESULTS', results: mappedResults as any });
    } else if (type === 'LIST_NOTES') {
      if (!listNotesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload || {};
      const results = await listNotesUseCase.execute(payload.limit, payload.offset, payload.category, payload.tag);
      const mappedResults = results.map(r => ({
        ...r,
        created_at: r.createdAt
      }));
      self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any });
    } else if (type === 'SUGGEST_CATEGORY') {
      if (!searchNotesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload; // query text
      // Use search to find similar notes
      const results = await searchNotesUseCase.execute(payload);
      // Aggregate top categories
      const categoryCounts: Record<string, number> = {};
      results.forEach(r => {
        if (r.category) {
          categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
        }
      });
      // Sort by frequency
      const topCategory = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a])[0];

      self.postMessage({ type: 'CATEGORY_SUGGESTED', result: topCategory || null });
    } else if (type === 'GENERATE_TAGS') {
      try {
        if (!taggingService) {
          console.log("Worker: Lazy Initializing Tagging Service...");
          taggingService = new TaggingService();
          await taggingService.initialize();
        }
        const payload = (e.data as any).payload;
        console.log("Worker: Generating tags for", payload);
        const tags = await taggingService.generateTags(payload);
        self.postMessage({ type: 'TAGS_GENERATED', result: tags });
      } catch (err) {
        console.error("Worker: Tag Gen Error", err);
        self.postMessage({ type: 'TAGS_GENERATED', result: [] });
        self.postMessage({ type: 'ERROR', error: `Tagging Failed: ${(err as Error).message}` });
      }
    } else if (type === 'DELETE_NOTE') {
      if (!deleteNoteUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await deleteNoteUseCase.execute(payload);
      self.postMessage({ type: 'NOTE_DELETED', id: payload });
    } else if (type === 'UPDATE_NOTE') {
      if (!noteRepository) throw new Error('Not initialized');
      const note = (e.data as any).payload;
      await noteRepository.update(note);
      self.postMessage({ type: 'NOTE_UPDATED' });
    } else if (type === 'LIST_CATEGORIES') {
      if (!manageCategoriesUseCase) throw new Error('Not initialized');
      const results = await manageCategoriesUseCase.list();
      self.postMessage({ type: 'CATEGORIES_LISTED', results });
    } else if (type === 'ADD_CATEGORY') {
      if (!manageCategoriesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const result = await manageCategoriesUseCase.add(payload);
      self.postMessage({ type: 'CATEGORY_ADDED', result });
    } else if (type === 'DELETE_CATEGORY') {
      if (!manageCategoriesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await manageCategoriesUseCase.delete(payload);
      self.postMessage({ type: 'CATEGORY_DELETED', id: payload });
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
    } else if (type === 'EXPORT_DB') {
      if (!noteRepository) throw new Error('Not initialized');
      const blob = await noteRepository.exportDatabase();
      self.postMessage({ type: 'EXPORT_DB_RESULT', payload: blob });
    } else if (type === 'IMPORT_DB') {
      const file = (e.data as any).payload;

      // 1. Close existing DB
      if (noteRepository) {
        noteRepository.close();
      }

      // 2. Overwrite OPFS file
      try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle('notes.db', { create: true });
        // @ts-ignore
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();

        // 3. Re-initialize
        await initialize();
        self.postMessage({ type: 'IMPORT_DB_RESULT' });

        // Helper refresh
        // Need to get valid worker instance or self post
        if (listNotesUseCase) {
          const payload = { limit: 20, offset: 0 };
          const results = await listNotesUseCase.execute(payload.limit, payload.offset);
          const mappedResults = results.map(r => ({ ...r, created_at: r.createdAt }));
          self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any });
        }
      } catch (err) {
        console.error("OPFS Import Error", err);
        self.postMessage({ type: 'ERROR', error: "Failed to overwrite database file. " + err });
      }
    } else if (type === 'GET_NOTE') {
      if (!getNoteUseCase) throw new Error('Not initialized');
      const id = (e.data as any).payload;
      const result = await getNoteUseCase.execute(id);
      if (result) {
        // Map keys for frontend compatibility
        const mapped = { ...result, created_at: result.createdAt };
        self.postMessage({ type: 'NOTE_FOUND', result: mapped });
      } else {
        self.postMessage({ type: 'NOTE_FOUND', result: null });
      }
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message });
  }
};
