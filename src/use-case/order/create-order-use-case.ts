import { InvalidOrderError } from '../../entities/order-entity.js';
import { UserNotFoundError } from '../../exception/user-not-found-error.js';
import type { IOrderCreator } from '../../repository/i-order-repository.js';
import type { IProductReader } from '../../repository/i-product-repository.js';
import type { IUserReader } from '../../repository/i-user-repository.js';
import { BuildCartSummaryUseCase, type BuildCartSummaryInput } from '../cart/build-cart-summary-use-case.js';
import { toOrderOutput, type OrderOutput } from './order-output.js';

export interface CreateOrderInput extends BuildCartSummaryInput {
  userId: string;
}

const MAX_ITEM_QUANTITY = 2_147_483_647;

export class CreateOrderUseCase {
  private readonly buildCartSummaryUseCase: BuildCartSummaryUseCase;

  constructor(
    private readonly orderRepository: IOrderCreator,
    productRepository: IProductReader,
    private readonly userRepository: IUserReader,
  ) {
    this.buildCartSummaryUseCase = new BuildCartSummaryUseCase(productRepository);
  }

  async execute(input: CreateOrderInput): Promise<OrderOutput> {
    if (input.items.length === 0) {
      throw new InvalidOrderError('O pedido deve conter pelo menos um item.');
    }

    const quantities = new Map<string, number>();
    for (const item of input.items) {
      const productId = item.productId.trim();
      if (!productId) {
        throw new InvalidOrderError('Informe o identificador do produto.');
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        throw new InvalidOrderError('A quantidade deve ser um número inteiro maior ou igual a um.');
      }
      const quantity = (quantities.get(productId) ?? 0) + item.quantity;
      if (quantity > MAX_ITEM_QUANTITY) {
        throw new InvalidOrderError('A quantidade do produto excede o limite suportado.');
      }
      quantities.set(productId, quantity);
    }

    if (!await this.userRepository.findById(input.userId)) {
      throw new UserNotFoundError();
    }

    const summary = await this.buildCartSummaryUseCase.execute({
      items: [...quantities].map(([productId, quantity]) => ({ productId, quantity })),
    });
    const order = await this.orderRepository.create({
      userId: input.userId,
      items: summary.items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    return toOrderOutput(order);
  }
}
