import { ProductNotFoundError } from '../../exception/product-not-found-error.js';
import type { IProductReader } from '../../repository/i-product-repository.js';
import { toProductOutput, type ProductOutput } from './product-output.js';

export class GetProductByIdUseCase {
  constructor(private readonly productRepository: IProductReader) {}

  async execute(id: string): Promise<ProductOutput> {
    const product = await this.productRepository.findById(id.trim());
    if (!product) {
      throw new ProductNotFoundError();
    }
    return toProductOutput(product);
  }
}
