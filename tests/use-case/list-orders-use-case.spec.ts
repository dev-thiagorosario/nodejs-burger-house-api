import { describe, expect, it, vi } from 'vitest';

import { Order } from '../../src/entities/order-entity.js';
import { User } from '../../src/entities/user-entity.js';
import { UserNotFoundError } from '../../src/exception/user-not-found-error.js';
import type { IOrderReader, OrderDetails } from '../../src/repository/i-order-repository.js';
import type { IUserReader } from '../../src/repository/i-user-repository.js';
import { ListOrdersUseCase } from '../../src/use-case/order/list-orders-use-case.js';

const userId = '11111111-1111-4111-8111-111111111111';
const date = new Date('2026-09-21T12:00:00Z');

function user(isAdmin = false) {
  return new User({
    id: userId, fullName: 'Cliente Teste', email: 'cliente@example.com', passwordHash: 'hash',
    cep: '40000-000', isAdmin, createdAt: date, updatedAt: date,
  });
}

function setup(isAdmin = false, orders: OrderDetails[] = []) {
  const orderRepository = {
    findAll: vi.fn<IOrderReader['findAll']>().mockResolvedValue(orders),
  } satisfies Pick<IOrderReader, 'findAll'>;
  const userRepository = {
    findById: vi.fn<IUserReader['findById']>().mockResolvedValue(user(isAdmin)),
  } satisfies Pick<IUserReader, 'findById'>;
  const useCase = new ListOrdersUseCase(orderRepository, userRepository);
  return { useCase, orderRepository, userRepository };
}

describe('ListOrdersUseCase', () => {
  it('uses only the authenticated customer scope when no status is given', async () => {
    const { useCase, orderRepository, userRepository } = setup();

    expect(await useCase.execute({ userId })).toEqual([]);

    expect(userRepository.findById).toHaveBeenCalledExactlyOnceWith(userId);
    expect(orderRepository.findAll).toHaveBeenCalledExactlyOnceWith({ userId });
  });

  it.each([
    ['pending', 'pending'], ['withdrawn', 'pickedUp'], ['cancelled', 'cancelled'],
  ] as const)('maps %s before requesting customer orders', async (status, domainStatus) => {
    const { useCase, orderRepository } = setup();

    await useCase.execute({ userId, status });

    expect(orderRepository.findAll).toHaveBeenCalledExactlyOnceWith({ userId, status: domainStatus });
  });

  it('requests every customer and status for an administrator without a filter', async () => {
    const { useCase, orderRepository } = setup(true);

    await useCase.execute({ userId });

    expect(orderRepository.findAll).toHaveBeenCalledExactlyOnceWith({});
  });

  it.each([
    ['pending', 'pending'], ['withdrawn', 'pickedUp'], ['cancelled', 'cancelled'],
  ] as const)('maps %s while preserving administrator scope', async (status, domainStatus) => {
    const { useCase, orderRepository } = setup(true);

    await useCase.execute({ userId, status });

    expect(orderRepository.findAll).toHaveBeenCalledExactlyOnceWith({ status: domainStatus });
  });

  it('reads current administrator privileges from the database on every listing', async () => {
    const { useCase, orderRepository, userRepository } = setup();
    userRepository.findById.mockResolvedValueOnce(user(true)).mockResolvedValueOnce(user(false));

    await useCase.execute({ userId, status: 'withdrawn' });
    await useCase.execute({ userId, status: 'withdrawn' });

    expect(userRepository.findById).toHaveBeenCalledTimes(2);
    expect(userRepository.findById).toHaveBeenNthCalledWith(1, userId);
    expect(userRepository.findById).toHaveBeenNthCalledWith(2, userId);
    expect(orderRepository.findAll).toHaveBeenNthCalledWith(1, { status: 'pickedUp' });
    expect(orderRepository.findAll).toHaveBeenNthCalledWith(2, { userId, status: 'pickedUp' });
  });

  it('returns all persisted statuses through the existing output with historical items and totals', async () => {
    const details = (['pending', 'pickedUp', 'cancelled'] as const).map((status, index) => ({
      user: { id: userId, fullName: 'Cliente Teste' },
      order: new Order({
        id: index + 1, userId, status, createdAt: date, updatedAt: date,
        items: [{ id: index + 10, productId: 'burger', productName: 'Nome na compra', unitPrice: 29.9, quantity: 2 }],
      }),
    }));
    const { useCase, orderRepository } = setup(false, details);

    const result = await useCase.execute({ userId });

    expect(result.map((order) => order.status)).toEqual(['pending', 'pickedUp', 'cancelled']);
    expect(result[0]).toEqual({
      id: 1, userId, status: 'pending', user: { id: userId, fullName: 'Cliente Teste' },
      items: [{ id: 10, productId: 'burger', name: 'Nome na compra', unitPrice: 29.9, quantity: 2, subtotal: 59.8 }],
      totalItems: 2, total: 59.8, pickedUpAt: null, createdAt: date, updatedAt: date,
    });
    expect(orderRepository.findAll).toHaveBeenCalledExactlyOnceWith({ userId });
  });

  it('does not read orders after the authenticated user has been deleted', async () => {
    const { useCase, orderRepository, userRepository } = setup();
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ userId, status: 'pending' })).rejects.toBeInstanceOf(UserNotFoundError);

    expect(orderRepository.findAll).not.toHaveBeenCalled();
  });

  it('stops before reading orders if the current user cannot be loaded', async () => {
    const { useCase, orderRepository, userRepository } = setup();
    const error = new Error('users unavailable');
    userRepository.findById.mockRejectedValue(error);

    await expect(useCase.execute({ userId })).rejects.toBe(error);

    expect(orderRepository.findAll).not.toHaveBeenCalled();
  });

  it('propagates order repository failures', async () => {
    const { useCase, orderRepository } = setup();
    const error = new Error('orders unavailable');
    orderRepository.findAll.mockRejectedValue(error);

    await expect(useCase.execute({ userId, status: 'cancelled' })).rejects.toBe(error);
  });
});
