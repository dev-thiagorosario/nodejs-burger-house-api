import type { Category, ICategoryRepository } from '../../repository/i-category-repository.js';

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }
}
