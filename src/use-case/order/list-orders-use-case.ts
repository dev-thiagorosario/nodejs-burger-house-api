import { UserNotFoundError } from '../../exception/user-not-found-error.js';
import type { IOrderReader } from '../../repository/i-order-repository.js';
import type { IUserReader } from '../../repository/i-user-repository.js';
import { toOrderOutput, type OrderOutput } from './order-output.js';

export class ListOrdersUseCase {
  constructor(
    private readonly orderRepository: Pick<IOrderReader, 'findAll' | 'findByUserId'>,
    private readonly userRepository: Pick<IUserReader, 'findById'>,
  ) {}

  async execute(userId: string): Promise<OrderOutput[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    const orders = user.isAdmin
      ? await this.orderRepository.findAll()
      : await this.orderRepository.findByUserId(user.id);
    return orders.map(toOrderOutput);
  }
}
