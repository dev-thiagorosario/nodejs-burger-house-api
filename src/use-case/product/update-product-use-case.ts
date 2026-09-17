import { Product, type ProductProps } from '../../entities/product-entity.js';
import { ProductNotFoundError } from '../../exception/product-not-found-error.js';
import type { IProductRepository } from '../../repository/i-product-repository.js';
import { toProductOutput, type ProductOutput } from './product-output.js';

export type UpdateProductInput = { id: string } & Partial<Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt' | 'images'>>;

export class UpdateProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: UpdateProductInput): Promise<ProductOutput> {
    const existing = await this.productRepository.findById(input.id.trim());
    if (!existing) {
      throw new ProductNotFoundError();
    }

    // Work on a copy so a later validation failure cannot partially mutate the loaded entity.
    const product = new Product(toProductOutput(existing));
    if (input.name !== undefined) product.rename(input.name);
    if (input.description !== undefined) product.changeDescription(input.description);
    if (input.price !== undefined) product.changePrice(input.price);
    if (input.categoryId !== undefined) product.changeCategory(input.categoryId);
    if (input.imageAlt !== undefined) product.changeImageAlt(input.imageAlt);
    if (input.isActive === true) product.activate();
    if (input.isActive === false) product.deactivate();

    return toProductOutput(await this.productRepository.update(product));
  }
}
