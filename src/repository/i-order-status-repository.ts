export interface OrderStatusOption {
  id: number;
  name: string;
}

export interface IOrderStatusRepository {
  findAll(): Promise<OrderStatusOption[]>;
}
