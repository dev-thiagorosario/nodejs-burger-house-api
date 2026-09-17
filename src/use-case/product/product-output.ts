import type { Product } from '../../entities/product-entity.js';

export interface ProductOutput {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  mobileImageUrl: string;
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
    imageUrl: product.imageUrl,
    mobileImageUrl: product.mobileImageUrl,
    imageAlt: product.imageAlt,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
