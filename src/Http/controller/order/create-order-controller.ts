import type { NextFunction, Request, Response } from 'express';

import { InvalidOrderError } from '../../../entities/order-entity.js';
import { InvalidCartSummaryError } from '../../../exception/invalid-cart-summary-error.js';
import { ProductNotAvailableError } from '../../../exception/product-not-available-error.js';
import { ProductNotFoundError } from '../../../exception/product-not-found-error.js';
import { UserNotFoundError } from '../../../exception/user-not-found-error.js';
import type { CreateOrderUseCase } from '../../../use-case/order/create-order-use-case.js';
import { createOrderBodySchema, createOrderSessionSchema } from '../../request/order/create-order-request.js';

export class CreateOrderController {
  constructor(private readonly createOrderUseCase: CreateOrderUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const session = createOrderSessionSchema.safeParse(response.locals);
    if (!session.success) {
      response.status(401).json({ success: false, message: 'Não autenticado.' });
      return;
    }

    const input = createOrderBodySchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({
        success: false,
        message: 'Verifique os dados informados.',
        errors: input.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const order = await this.createOrderUseCase.execute({
        ...input.data,
        userId: session.data.userId,
      });
      response.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso.',
        data: { order },
      });
    } catch (error: unknown) {
      if (error instanceof ProductNotFoundError || error instanceof UserNotFoundError) {
        response.status(404).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof ProductNotAvailableError) {
        response.status(409).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof InvalidOrderError || error instanceof InvalidCartSummaryError) {
        response.status(400).json({ success: false, message: error.message });
        return;
      }

      next(error);
    }
  };
}
