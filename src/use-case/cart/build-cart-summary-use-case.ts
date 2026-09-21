import { InvalidCartSummaryError } from '../../exception/invalid-cart-summary-error.js';
import { ProductNotAvailableError } from '../../exception/product-not-available-error.js';
import { ProductNotFoundError } from '../../exception/product-not-found-error.js';
import type { IProductReader } from '../../repository/i-product-repository.js';
import type { CartSummaryOutput } from './cart-summary-output.js';

export interface BuildCartSummaryInput {
  items: Array<{ productId: string; quantity: number }>;
}

export class BuildCartSummaryUseCase {
  constructor(private readonly productRepository: IProductReader) {}

  async execute(input: BuildCartSummaryInput): Promise<CartSummaryOutput> {
    const ids = [...new Set(input.items.map((item) => item.productId))];
    const products = await this.productRepository.findByIds(ids);
    const productsById = new Map(products.map((product) => [product.id, product]));
    let totalItems = 0;
    let totalCents = 0;

    const items = input.items.map(({ productId, quantity }) => {
      const product = productsById.get(productId);
      if (!product) {
        throw new ProductNotFoundError();
      }
      if (!product.isActive) {
        throw new ProductNotAvailableError();
      }

      // Keep monetary calculations in cents until formatting the output.
      const subtotalCents = Math.round(product.price * 100) * quantity;
      totalItems += quantity;
      totalCents += subtotalCents;
      // At 2^46 currency units, adjacent numbers are more than one cent apart.
      if (!Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(totalCents) ||
        !Number.isSafeInteger(totalItems) || totalCents / 100 >= 2 ** 46) {
        throw new InvalidCartSummaryError('O resumo do carrinho excede o limite numérico suportado.');
      }

      return {
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity,
        subtotal: subtotalCents / 100,
      };
    });

    return { items, totalItems, total: totalCents / 100 };
  }
}
