import { ForbiddenOrderStatusUpdateError } from '../../exception/forbidden-order-status-update-error.js';
import { UserNotFoundError } from '../../exception/user-not-found-error.js';
import type { IOrderStatusWriter } from '../../repository/i-order-repository.js';
import type { IUserReader } from '../../repository/i-user-repository.js';
import { toOrderDetailsOutput, type OrderDetailsOutput } from './order-output.js';

export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orderRepository: IOrderStatusWriter,
    private readonly userRepository: Pick<IUserReader, 'findById'>,
  ) {}

  async execute(input: { userId: string; id: number; statusId: number }): Promise<OrderDetailsOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new UserNotFoundError();
    if (!user.isAdmin) throw new ForbiddenOrderStatusUpdateError();
    return toOrderDetailsOutput(await this.orderRepository.updateStatus(input.id, input.statusId));
  }
}
