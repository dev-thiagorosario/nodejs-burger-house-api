import type { NextFunction, Request, Response } from 'express';

import type { ListCategoriesUseCase } from '../../../use-case/category/list-categories-use-case.js';

export class ListCategoriesController {
  constructor(private readonly listCategoriesUseCase: ListCategoriesUseCase) {}

  handle = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.listCategoriesUseCase.execute();
      response.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}
