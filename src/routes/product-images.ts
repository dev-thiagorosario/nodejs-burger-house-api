import { productImageUrl } from '../entities/product-image.js';
import express, { Router } from 'express';
import type { Pool } from 'pg';
import { productIdSchema } from '../Http/request/product/product-fields.js';
import { detectImageType, removeProductImage, saveProductImage } from '../services/product-images-service.js';

export function productImagesRouter(pool: Pool): Router {
  const router = Router();
  const path = '/products/:id/images/:variant';
  router.use(path, (req, res, next) => {
    if (!productIdSchema.safeParse(req.params.id).success || !['desktop', 'mobile'].includes(req.params.variant)) {
      res.status(400).json({ success: false, message: 'Produto ou versão de imagem inválidos.' });
      return;
    }
    next();
  });
  router.get(path, async (req, res, next) => {
    try {
      const result = await pool.query<{ data: Buffer; mime_type: string }>(
        'SELECT data, mime_type FROM product_images WHERE product_id = $1 AND variant = $2',
        [req.params.id, req.params.variant],
      );
      const image = result.rows[0];
      if (!image) {
        res.status(404).json({ success: false, message: 'Imagem não encontrada.' });
        return;
      }
      res.set('Content-Type', image.mime_type).set('X-Content-Type-Options', 'nosniff')
        .set('Cache-Control', 'no-cache').send(image.data);
    } catch (error) { next(error); }
  });
  router.put(path, express.raw({ type: 'image/*', limit: '10mb' }), async (req, res, next) => {
    const data: unknown = req.body;
    if (!Buffer.isBuffer(data) || !data.length || detectImageType(data) !== req.get('content-type')?.split(';')[0]?.trim()) {
      res.status(400).json({ success: false, message: 'Envie o arquivo binário com Content-Type de imagem válido.' });
      return;
    }
    const variant = req.params.variant as 'desktop' | 'mobile';
    const filename = req.get('x-file-name')?.trim() || `${req.params.id}-${variant}`;
    try {
      if (!await saveProductImage(pool, req.params.id, variant, filename, data)) {
        res.status(404).json({ success: false, message: 'Produto não encontrado.' });
        return;
      }
      res.json({ success: true, data: { variant, fileName: filename, mimeType: detectImageType(data), url: productImageUrl(req.params.id, variant) } });
    } catch (error) { next(error); }
  });
  router.delete(path, async (req, res, next) => {
    try {
      if (!await removeProductImage(pool, req.params.id, req.params.variant as 'desktop' | 'mobile')) {
        res.status(404).json({ success: false, message: 'Imagem não encontrada.' });
        return;
      }
      res.status(204).end();
    } catch (error) { next(error); }
  });
  router.use((error: { type?: string }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error.type === 'entity.too.large') {
      res.status(413).json({ success: false, message: 'A imagem deve ter no máximo 10 MB.' });
      return;
    }
    next(error);
  });
  return router;
}
