export type WorkerMessage =
  | { type: 'INIT' }
  | { type: 'ADD_NOTE'; payload: { text: string; category: string; tags: string[] } }
  | { type: 'SEARCH'; payload: { query: string; limit?: number; offset?: number } }
  | { type: 'LIST_NOTES'; payload?: { limit: number; offset: number; category?: string; tag?: string; pinned?: boolean } }
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
  | { type: 'NOTE_UPDATED'; payload?: any }
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
