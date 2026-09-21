import type { NextFunction, Request, Response } from 'express';

import { UserNotFoundError } from '../../../exception/user-not-found-error.js';
import type { ListOrdersUseCase } from '../../../use-case/order/list-orders-use-case.js';
import { listOrdersQuerySchema, listOrdersSessionSchema } from '../../request/order/list-orders-request.js';

export class ListOrdersController {
  constructor(private readonly listOrdersUseCase: ListOrdersUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const session = listOrdersSessionSchema.safeParse(response.locals);
    if (!session.success) {
      response.status(401).json({ success: false, message: 'Não autenticado.' });
      return;
    }
    const query = listOrdersQuerySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({
        success: false,
        message: 'Verifique os dados informados.',
        errors: query.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'query', message: issue.message,
        })),
      });
      return;
    }
    try {
      const orders = await this.listOrdersUseCase.execute(session.data.userId);
      response.status(200).json({ success: true, data: { orders } });
    } catch (error: unknown) {
      if (error instanceof UserNotFoundError) {
        response.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  };
}
