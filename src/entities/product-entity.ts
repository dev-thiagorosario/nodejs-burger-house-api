import { ProductCategory, InvalidProductCategoryError } from '../value-object/product-category-value-object.js';

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class InvalidProductError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProductError';
  }
}

export class Product {
  public readonly id: string;
  public readonly imageUrl: string;

  private nameValue: string;
  private descriptionValue: string;
  private priceValue: number;
  private categoryValue: ProductCategory;
  private isActiveValue: boolean;
  private readonly createdAtValue: Date;
  private updatedAtValue: Date;

  constructor(props: ProductProps) {
    if (!props.id.trim()) {
      throw new InvalidProductError('O identificador do produto não pode ser vazio.');
    }

    this.validateName(props.name);
    this.validatePrice(props.price);
    const category = this.createCategory(props.categoryId);

    if (props.isActive !== undefined && typeof props.isActive !== 'boolean') {
      throw new InvalidProductError('O campo isActive deve ser um booleano.');
    }

    if (
      Number.isNaN(props.createdAt.getTime()) ||
      Number.isNaN(props.updatedAt.getTime())
    ) {
      throw new InvalidProductError('As datas do produto são inválidas.');
    }

    if (props.updatedAt.getTime() < props.createdAt.getTime()) {
      throw new InvalidProductError(
        'A data de atualização não pode anteceder a data de criação.',
      );
    }

    this.id = props.id.trim();
    this.nameValue = props.name.trim();
    this.descriptionValue = props.description;
    this.priceValue = props.price;
    this.categoryValue = category;
    this.imageUrl = props.imageUrl;
    this.isActiveValue = props.isActive ?? true;
    this.createdAtValue = new Date(props.createdAt);
    this.updatedAtValue = new Date(props.updatedAt);
  }

  get name(): string { return this.nameValue; }
  get description(): string { return this.descriptionValue; }
  get price(): number { return this.priceValue; }
  get categoryId(): number { return this.categoryValue.id; }
  get category(): ProductCategory { return this.categoryValue; }
  get isActive(): boolean { return this.isActiveValue; }
  get createdAt(): Date { return new Date(this.createdAtValue); }
  get updatedAt(): Date { return new Date(this.updatedAtValue); }

  rename(name: string): void {
    this.validateName(name);
    this.nameValue = name.trim();
    this.touch();
  }

  changePrice(price: number): void {
    this.validatePrice(price);
    this.priceValue = price;
    this.touch();
  }

  changeDescription(description: string): void {
    this.descriptionValue = description;
    this.touch();
  }

  changeCategory(categoryId: number): void {
    this.categoryValue = this.createCategory(categoryId);
    this.touch();
  }

  activate(): void {
    this.isActiveValue = true;
    this.touch();
  }

  deactivate(): void {
    this.isActiveValue = false;
    this.touch();
  }

  private validateName(name: string): void {
    if (!name.trim()) {
      throw new InvalidProductError('O nome do produto não pode ser vazio.');
    }
  }

  private validatePrice(price: number): void {
    if (!Number.isFinite(price) || price < 0) {
      throw new InvalidProductError('O preço do produto deve ser um número finito não negativo.');
    }
  }

  private createCategory(categoryId: number): ProductCategory {
    try {
      return new ProductCategory(categoryId);
    } catch (error) {
      if (error instanceof InvalidProductCategoryError) {
        throw new InvalidProductError(error.message);
      }
      throw error;
    }
  }

  private touch(): void {
    this.updatedAtValue = new Date(Math.max(Date.now(), this.updatedAtValue.getTime()));
  }
}
