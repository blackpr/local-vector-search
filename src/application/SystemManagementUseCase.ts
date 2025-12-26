import type { DatabaseManager } from '../domain/DatabaseManager';

export class SystemManagementUseCase {
  private readonly databaseManager: DatabaseManager;

  constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  async exportDatabase(): Promise<Blob> {
    return this.databaseManager.exportDatabase();
  }

  async importDatabase(file: File): Promise<void> {
    return this.databaseManager.replaceDatabase(file);
  }
}
