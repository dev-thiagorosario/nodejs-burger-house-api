import { UserNotFoundError } from '../../exception/user-not-found-error.js';
import type { IOrderReader, OrderFilters } from '../../repository/i-order-repository.js';
import type { IUserReader } from '../../repository/i-user-repository.js';
import { OrderStatus, type OrderStatusFilter } from '../../value-object/order-status-value-object.js';
import { toOrderDetailsOutput, type OrderDetailsOutput } from './order-output.js';

export interface ListOrdersInput {
  userId: string;
  status?: OrderStatusFilter;
}

export class ListOrdersUseCase {
  constructor(
    private readonly orderRepository: Pick<IOrderReader, 'findAll'>,
    private readonly userRepository: Pick<IUserReader, 'findById'>,
  ) {}

  async execute(input: ListOrdersInput): Promise<OrderDetailsOutput[]> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    const filters: OrderFilters = user.isAdmin ? {} : { userId: user.id };
    if (input.status !== undefined) {
      filters.status = OrderStatus.fromFilter(input.status).value;
    }
    const orders = await this.orderRepository.findAll(filters);
    return orders.map(toOrderDetailsOutput);
  }
}
