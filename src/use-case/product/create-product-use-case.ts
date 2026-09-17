import { Product, type ProductProps } from '../../entities/product-entity.js';
import { ProductAlreadyExistsError } from '../../exception/product-already-exists-error.js';
import type { IProductRepository } from '../../repository/i-product-repository.js';
import { toProductOutput, type ProductOutput } from './product-output.js';

export type CreateProductInput = Omit<ProductProps, 'createdAt' | 'updatedAt'>;

export class CreateProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<ProductOutput> {
    const now = new Date();
    const product = new Product({ ...input, createdAt: now, updatedAt: now });
    if (await this.productRepository.findById(product.id)) {
      throw new ProductAlreadyExistsError();
    }
    return toProductOutput(await this.productRepository.create(product));
  }
}
