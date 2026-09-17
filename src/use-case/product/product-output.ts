import { productImageUrl, type ProductImage } from '../../entities/product-image.js';
import type { Product } from '../../entities/product-entity.js';

export interface ProductOutput {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  images: Array<ProductImage & { url: string }>;
  imageAlt: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductOutput(product: Product): ProductOutput {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    categoryId: product.categoryId,
    images: product.images.map((image) => ({ ...image, url: productImageUrl(product.id, image.variant) })),
    imageAlt: product.imageAlt,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
