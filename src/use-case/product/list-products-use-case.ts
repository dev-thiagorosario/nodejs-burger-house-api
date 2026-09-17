import type { IProductReader } from '../../repository/i-product-repository.js';
import { ProductCategory } from '../../value-object/product-category-value-object.js';
import { toProductOutput, type ProductOutput } from './product-output.js';

export interface ListProductsInput {
  categoryId?: number;
}

export class ListProductsUseCase {
  constructor(private readonly productRepository: IProductReader) {}

  async execute(input: ListProductsInput = {}): Promise<ProductOutput[]> {
    const products = input.categoryId === undefined
      ? await this.productRepository.findAll()
      : await this.productRepository.findByCategoryId(new ProductCategory(input.categoryId).id);
    return products.map(toProductOutput);
  }
}
