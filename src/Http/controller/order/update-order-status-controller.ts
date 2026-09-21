import type { NextFunction, Request, Response } from 'express';
import { InvalidOrderError } from '../../../entities/order-entity.js';
import { ForbiddenOrderStatusUpdateError } from '../../../exception/forbidden-order-status-update-error.js';
import { OrderNotFoundError } from '../../../exception/order-not-found-error.js';
import { UserNotFoundError } from '../../../exception/user-not-found-error.js';
import { InvalidOrderStatusError } from '../../../value-object/order-status-value-object.js';
import type { UpdateOrderStatusUseCase } from '../../../use-case/order/update-order-status-use-case.js';
import { listOrdersSessionSchema } from '../../request/order/list-orders-request.js';
import { updateOrderStatusRequestSchema } from '../../request/order/update-order-status-request.js';

export class UpdateOrderStatusController {
  constructor(private readonly useCase: UpdateOrderStatusUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const session = listOrdersSessionSchema.safeParse(response.locals);
    if (!session.success) {
      response.status(401).json({ success: false, message: 'Não autenticado.' });
      return;
    }
    const input = updateOrderStatusRequestSchema.safeParse({ params: request.params, body: request.body });
    if (!input.success) {
      response.status(400).json({ success: false, message: 'Verifique os dados informados.',
        errors: input.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      });
      return;
    }
    try {
      const order = await this.useCase.execute({ userId: session.data.userId, id: input.data.params.id, statusId: input.data.body.statusId });
      response.status(200).json({ success: true, data: { order } });
    } catch (error) {
      let status: number;
      if (error instanceof ForbiddenOrderStatusUpdateError) status = 403;
      else if (error instanceof OrderNotFoundError || error instanceof UserNotFoundError) status = 404;
      else if (error instanceof InvalidOrderStatusError) status = 400;
      else if (error instanceof InvalidOrderError) status = 409;
      else { next(error); return; }
      response.status(status).json({ success: false, message: (error as Error).message });
    }
  };
}
