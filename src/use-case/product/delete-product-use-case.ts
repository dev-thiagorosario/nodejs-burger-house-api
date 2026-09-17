import { ProductNotFoundError } from '../../exception/product-not-found-error.js';
import type { IProductRepository } from '../../repository/i-product-repository.js';

export class DeleteProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(id: string): Promise<void> {
    const product = await this.productRepository.findById(id.trim());
    if (!product) {
      throw new ProductNotFoundError();
    }
    product.deactivate();
    await this.productRepository.update(product);
  }
}
