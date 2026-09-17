const CATEGORY_NAMES = {
  1: 'Hamburguer',
  2: 'Porcoes',
  3: 'Bebidas',
} as const;

export type ProductCategoryId = keyof typeof CATEGORY_NAMES;
export type ProductCategoryName = typeof CATEGORY_NAMES[ProductCategoryId];

export class InvalidProductCategoryError extends Error {
  constructor() {
    super('A categoria deve ser Hamburguer (1), Porcoes (2) ou Bebidas (3).');
    this.name = 'InvalidProductCategoryError';
  }
}

export class ProductCategory {
  public readonly id: ProductCategoryId;

  constructor(id: number) {
    if (id !== 1 && id !== 2 && id !== 3) {
      throw new InvalidProductCategoryError();
    }
    this.id = id;
    Object.freeze(this);
  }

  get name(): ProductCategoryName { return CATEGORY_NAMES[this.id]; }

  static hamburguer(): ProductCategory { return new ProductCategory(1); }
  static porcoes(): ProductCategory { return new ProductCategory(2); }
  static bebidas(): ProductCategory { return new ProductCategory(3); }

  equals(other: ProductCategory): boolean { return this.id === other.id; }
}
