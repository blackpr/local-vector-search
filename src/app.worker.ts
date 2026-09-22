import { AddNoteUseCase } from './application/AddNoteUseCase';
import { DeleteNoteUseCase } from './application/DeleteNoteUseCase';
import { RestoreNoteUseCase } from './application/RestoreNoteUseCase';
import { ListNotesUseCase } from './application/ListNotesUseCase';
import { ManageCategoriesUseCase } from './application/ManageCategoriesUseCase';
import { SearchNotesUseCase } from './application/SearchNotesUseCase';
import { GetNoteUseCase } from './application/GetNoteUseCase';
import { UpdateNoteUseCase } from './application/UpdateNoteUseCase';
import { GenerateTagsUseCase } from './application/GenerateTagsUseCase';
import { SuggestCategoryUseCase } from './application/SuggestCategoryUseCase';
import { ExportDataUseCase } from './application/ExportDataUseCase';
import { ImportDataUseCase } from './application/ImportDataUseCase';
import { SystemManagementUseCase } from './application/SystemManagementUseCase';
import { ReindexNotesUseCase } from './application/ReindexNotesUseCase';

import { DatabaseFactory } from './infrastructure/DatabaseFactories';
import { SqliteNoteRepository } from './infrastructure/SqliteNoteRepository';
import { TransformersVectorService, VECTOR_MODEL_BYTES } from './infrastructure/TransformersVectorService';
import { EmbeddingTaggingService } from './infrastructure/EmbeddingTaggingService';
import { warmAppCache } from './offline/warmAppCache';
import { SqliteDatabaseManager } from './infrastructure/SqliteDatabaseManager';

import type { WorkerMessage, WorkerResponse } from './presentation/worker/WorkerMessages';

// Global dependency instances
let addNoteUseCase: AddNoteUseCase;
let searchNotesUseCase: SearchNotesUseCase;
let listNotesUseCase: ListNotesUseCase;
let deleteNoteUseCase: DeleteNoteUseCase;
let restoreNoteUseCase: RestoreNoteUseCase;
let manageCategoriesUseCase: ManageCategoriesUseCase;
let getNoteUseCase: GetNoteUseCase;
let updateNoteUseCase: UpdateNoteUseCase;
let generateTagsUseCase: GenerateTagsUseCase;
let suggestCategoryUseCase: SuggestCategoryUseCase;
let exportDataUseCase: ExportDataUseCase;
let importDataUseCase: ImportDataUseCase;
let systemManagementUseCase: SystemManagementUseCase;

let noteRepository: SqliteNoteRepository | undefined;
let vectorService: TransformersVectorService;
let taggingService: EmbeddingTaggingService;
let databaseManager: SqliteDatabaseManager;

async function initialize() {
  try {
    console.log("Worker: Initializing...");

    // One model now does search AND tagging, so progress is a single download.
    const files = new Map<string, { loaded: number, total: number }>();
    let maxProgress = 0;
    const sendProgress = (done = false) => {
      let loaded = 0;
      let knownTotal = 0;
      for (const file of files.values()) {
        loaded += file.loaded;
        if (file.total) knownTotal += file.total;
      }
      // Cap at 99% until the promise actually resolves
      const progress = done ? 100 : Math.min(99, (loaded / Math.max(knownTotal, VECTOR_MODEL_BYTES)) * 100);
      if (progress > maxProgress) {
        maxProgress = progress;
        self.postMessage({
          type: 'PROGRESS',
          payload: { status: 'progress', file: 'models', progress, loaded: progress, total: 100 }
        } as WorkerResponse);
      }
    };

    // 1. Initialize Infrastructure
    vectorService = new TransformersVectorService((data) => {
      if (data.status === 'progress' && data.file) {
        files.set(data.file, { loaded: data.loaded || 0, total: data.total || 0 });
        sendProgress();
      }
    });
    taggingService = new EmbeddingTaggingService(vectorService);

    // Start model loading immediately (in parallel with opening the DB)
    console.log("Worker: Loading embedding model...");
    const modelInitPromise = vectorService.initialize().then(() => {
      sendProgress(true);
    }).catch(err => {
      throw new Error(`Vector Model Load Failed: ${err.message}`);
    });

    console.log("Worker: Opening DB...");
    const { db, storage } = await DatabaseFactory.createDatabase().catch(err => {
      throw new Error(`DB Failed: ${err.message}`);
    });
    noteRepository = new SqliteNoteRepository(db);

    console.log("Worker: Waiting for Models...");
    await modelInitPromise;
    console.log("Worker: Models Loaded.");

    // databaseManager needs access to current noteRepository for export/closing
    databaseManager = new SqliteDatabaseManager(() => noteRepository);

    // 2. Initialize Application Layer (Use Cases)
    // We pass dependencies. implicit dependency injection.
    addNoteUseCase = new AddNoteUseCase(noteRepository, vectorService);
    searchNotesUseCase = new SearchNotesUseCase(noteRepository, vectorService);
    listNotesUseCase = new ListNotesUseCase(noteRepository);
    deleteNoteUseCase = new DeleteNoteUseCase(noteRepository);
    restoreNoteUseCase = new RestoreNoteUseCase(noteRepository);
    manageCategoriesUseCase = new ManageCategoriesUseCase(noteRepository);
    getNoteUseCase = new GetNoteUseCase(noteRepository);
    updateNoteUseCase = new UpdateNoteUseCase(noteRepository, vectorService);
    generateTagsUseCase = new GenerateTagsUseCase(taggingService);
    suggestCategoryUseCase = new SuggestCategoryUseCase(searchNotesUseCase);
    exportDataUseCase = new ExportDataUseCase(noteRepository);
    importDataUseCase = new ImportDataUseCase(noteRepository, vectorService);
    systemManagementUseCase = new SystemManagementUseCase(databaseManager);

    // Vectors from another model/precision are not comparable: re-embed once.
    const reindexed = await new ReindexNotesUseCase(noteRepository, vectorService).execute((done, total) => {
      self.postMessage({
        type: 'PROGRESS',
        payload: { status: 'progress', file: 'reindex', progress: (done / total) * 100, loaded: done, total }
      } as WorkerResponse);
    });
    if (reindexed > 0) console.log(`Worker: Re-embedded ${reindexed} notes for ${vectorService.version}`);

    console.log('System Ready.');
    self.postMessage({ type: 'READY', storage } as WorkerResponse);

    // Everything this worker fetched (its own chunk, sqlite3.wasm, the ONNX
    // runtime) goes into the app cache so a cold start works offline.
    void warmAppCache();
  } catch (error) {
    console.error('Initialization error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message } as WorkerResponse);
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
      self.postMessage({ type: 'NOTE_ADDED', text: payload.text } as WorkerResponse);
    } else if (type === 'SEARCH') {
      if (!searchNotesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const query = typeof payload === 'string' ? payload : payload.query;
      const limit = typeof payload === 'object' ? payload.limit : undefined;
      const offset = typeof payload === 'object' ? payload.offset : undefined;

      const results = await searchNotesUseCase.execute(query, limit, offset);
      const mappedResults = results.map(r => ({
        ...r,
        created_at: r.createdAt
      }));
      self.postMessage({ type: 'SEARCH_RESULTS', results: mappedResults as any } as WorkerResponse);
    } else if (type === 'LIST_NOTES') {
      if (!listNotesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload || {};
      const results = await listNotesUseCase.execute(payload.limit, payload.offset, payload.category, payload.tag, payload.pinned);
      const mappedResults = results.map(r => ({
        ...r,
        created_at: r.createdAt
      }));
      self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any } as WorkerResponse);
    } else if (type === 'SUGGEST_CATEGORY') {
      if (!suggestCategoryUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const result = await suggestCategoryUseCase.execute(payload);
      self.postMessage({ type: 'CATEGORY_SUGGESTED', result } as WorkerResponse);
    } else if (type === 'GENERATE_TAGS') {
      if (!generateTagsUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      console.log("Worker: Generating tags for", payload);
      try {
        const tags = await generateTagsUseCase.execute(payload);
        self.postMessage({ type: 'TAGS_GENERATED', result: tags } as WorkerResponse);
      } catch (err) {
        console.error("Worker: Tag Gen Error", err);
        self.postMessage({ type: 'TAGS_GENERATED', result: [] } as WorkerResponse);
        self.postMessage({ type: 'ERROR', error: `Tagging Failed: ${(err as Error).message}` } as WorkerResponse);
      }
    } else if (type === 'DELETE_NOTE') {
      if (!deleteNoteUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await deleteNoteUseCase.execute(payload);
      self.postMessage({ type: 'NOTE_DELETED', id: payload } as WorkerResponse);
    } else if (type === 'RESTORE_NOTE') {
      if (!restoreNoteUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await restoreNoteUseCase.execute(payload);
      self.postMessage({ type: 'NOTE_RESTORED', id: payload } as WorkerResponse);
    } else if (type === 'UPDATE_NOTE') {
      if (!updateNoteUseCase) throw new Error('Not initialized');
      const note = (e.data as any).payload;
      await updateNoteUseCase.execute(note);
      self.postMessage({ type: 'NOTE_UPDATED', payload: note } as WorkerResponse);
    } else if (type === 'LIST_CATEGORIES') {
      if (!manageCategoriesUseCase) throw new Error('Not initialized');
      const results = await manageCategoriesUseCase.list();
      self.postMessage({ type: 'CATEGORIES_LISTED', results } as WorkerResponse);
    } else if (type === 'ADD_CATEGORY') {
      if (!manageCategoriesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const result = await manageCategoriesUseCase.add(payload);
      self.postMessage({ type: 'CATEGORY_ADDED', result } as WorkerResponse);
    } else if (type === 'DELETE_CATEGORY') {
      if (!manageCategoriesUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      await manageCategoriesUseCase.delete(payload);
      self.postMessage({ type: 'CATEGORY_DELETED', id: payload } as WorkerResponse);
    } else if (type === 'EXPORT') {
      if (!exportDataUseCase) throw new Error('Not initialized');
      const results = await exportDataUseCase.execute();
      self.postMessage({ type: 'EXPORT_RESULT', payload: results } as WorkerResponse);
    } else if (type === 'IMPORT') {
      if (!importDataUseCase) throw new Error('Not initialized');
      const payload = (e.data as any).payload;
      const result = await importDataUseCase.execute(payload);
      self.postMessage({ type: 'IMPORT_RESULT', payload: result } as WorkerResponse);
      // Helper refresh
      const notes = await listNotesUseCase.execute();
      const mappedResults = notes.map(r => ({ ...r, created_at: r.createdAt }));
      self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any } as WorkerResponse);
    } else if (type === 'EXPORT_DB') {
      if (!systemManagementUseCase) throw new Error('Not initialized');
      const blob = await systemManagementUseCase.exportDatabase();
      self.postMessage({ type: 'EXPORT_DB_RESULT', payload: blob } as WorkerResponse);
    } else if (type === 'IMPORT_DB') {
      if (!systemManagementUseCase) throw new Error('Not initialized');
      const file = (e.data as any).payload;
      try {
        await systemManagementUseCase.importDatabase(file);
        // Re-initialize to reload DB
        await initialize();
        self.postMessage({ type: 'IMPORT_DB_RESULT' } as WorkerResponse);

        // Helper refresh
        if (listNotesUseCase) {
          const notes = await listNotesUseCase.execute();
          const mappedResults = notes.map(r => ({ ...r, created_at: r.createdAt }));
          self.postMessage({ type: 'NOTES_LISTED', results: mappedResults as any } as WorkerResponse);
        }
      } catch (err) {
        self.postMessage({ type: 'ERROR', error: (err as Error).message } as WorkerResponse);
      }
    } else if (type === 'GET_NOTE') {
      if (!getNoteUseCase) throw new Error('Not initialized');
      const id = (e.data as any).payload;
      const result = await getNoteUseCase.execute(id);
      if (result) {
        const mapped = { ...result, created_at: result.createdAt };
        self.postMessage({ type: 'NOTE_FOUND', result: mapped } as WorkerResponse);
      } else {
        self.postMessage({ type: 'NOTE_FOUND', result: null } as WorkerResponse);
      }
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ type: 'ERROR', error: (error as Error).message } as WorkerResponse);
  }
};
