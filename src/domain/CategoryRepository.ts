import type { Category } from './Category';

export interface CategoryRepository {
  findAllCategories(): Promise<Category[]>;
  create(name: string): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
}
