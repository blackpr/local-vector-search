import type { Category } from '../domain/Category';
import type { CategoryRepository } from '../domain/CategoryRepository';

export class ManageCategoriesUseCase {
  private categoryRepository: CategoryRepository;

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  async list(): Promise<Category[]> {
    return this.categoryRepository.findAllCategories();
  }

  async add(name: string): Promise<Category> {
    return this.categoryRepository.create(name);
  }

  async delete(id: number): Promise<void> {
    return this.categoryRepository.deleteCategory(id);
  }
}
