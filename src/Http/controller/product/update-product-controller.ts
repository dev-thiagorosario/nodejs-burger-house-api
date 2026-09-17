import type { NextFunction, Request, Response } from 'express';

import { ProductNotFoundError } from '../../../exception/product-not-found-error.js';
import { InvalidProductError } from '../../../entities/product-entity.js';
import type { UpdateProductUseCase } from '../../../use-case/product/update-product-use-case.js';
import { updateProductRequestSchema } from '../../request/product/update-product-request.js';

export class UpdateProductController {
  constructor(private readonly updateProductUseCase: UpdateProductUseCase) {}

  handle = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const input = updateProductRequestSchema.safeParse({ params: request.params, body: request.body });
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
      const product = await this.updateProductUseCase.execute({
        id: input.data.params.id,
        ...(input.data.body.name !== undefined ? { name: input.data.body.name } : {}),
        ...(input.data.body.description !== undefined ? { description: input.data.body.description } : {}),
        ...(input.data.body.price !== undefined ? { price: input.data.body.price } : {}),
        ...(input.data.body.categoryId !== undefined ? { categoryId: input.data.body.categoryId } : {}),
        ...(input.data.body.imageAlt !== undefined ? { imageAlt: input.data.body.imageAlt } : {}),
        ...(input.data.body.isActive !== undefined ? { isActive: input.data.body.isActive } : {}),
      });
      response.status(200).json({
        success: true,
        message: 'Produto atualizado com sucesso.',
        data: { product },
      });
    } catch (error: unknown) {
      if (error instanceof ProductNotFoundError) {
        response.status(404).json({ success: false, message: error.message });
        return;
      }
      if (error instanceof InvalidProductError) {
        response.status(400).json({ success: false, message: error.message });
        return;
      }

      next(error);
    }
  };
}
