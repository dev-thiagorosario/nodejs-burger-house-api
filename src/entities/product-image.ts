export type ImageVariant = 'desktop' | 'mobile';

/** Metadata only; image bytes are loaded separately by the image endpoint. */
export interface ProductImage {
  variant: ImageVariant;
  fileName: string;
  mimeType: string;
}

export function productImageUrl(id: string, variant: ImageVariant): string {
  return `/products/${encodeURIComponent(id)}/images/${variant}`;
}
