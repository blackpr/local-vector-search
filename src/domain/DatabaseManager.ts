export interface DatabaseManager {
  exportDatabase(): Promise<Blob>;
  replaceDatabase(data: File): Promise<void>;
}
