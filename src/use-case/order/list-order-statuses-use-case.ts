import type { IOrderStatusRepository, OrderStatusOption } from '../../repository/i-order-status-repository.js';

export class ListOrderStatusesUseCase {
  constructor(private readonly orderStatusRepository: IOrderStatusRepository) {}

  async execute(): Promise<OrderStatusOption[]> {
    return this.orderStatusRepository.findAll();
  }
}
