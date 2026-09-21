import type { NextFunction, Request, Response } from 'express';

import type { ListOrderStatusesUseCase } from '../../../use-case/order/list-order-statuses-use-case.js';

export class ListOrderStatusesController {
  constructor(private readonly listOrderStatusesUseCase: ListOrderStatusesUseCase) {}

  handle = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const statuses = await this.listOrderStatusesUseCase.execute();
      response.status(200).json({
        success: true,
        data: { statuses },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}
