import type { NextFunction, Request, Response } from 'express';

import { InvalidCartSummaryError } from '../../../exception/invalid-cart-summary-error.js';
import { ProductNotAvailableError } from '../../../exception/product-not-available-error.js';
import { ProductNotFoundError } from '../../../exception/product-not-found-error.js';
import type { BuildCartSummaryUseCase } from '../../../use-case/cart/build-cart-summary-use-case.js';
import { cartSummaryBodySchema } from '../../request/cart/cart-summary-request.js';

export class CartSummaryController {
  constructor(private readonly buildCartSummaryUseCase: BuildCartSummaryUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const input = cartSummaryBodySchema.safeParse(request.body);
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
      const summary = await this.buildCartSummaryUseCase.execute(input.data);
      response.status(200).json({ success: true, data: summary });
    } catch (error: unknown) {
      if (error instanceof ProductNotFoundError) {
        response.status(404).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof ProductNotAvailableError) {
        response.status(409).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof InvalidCartSummaryError) {
        response.status(400).json({ success: false, message: error.message });
        return;
      }

      next(error);
    }
  };
}
