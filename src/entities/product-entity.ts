import { ProductCategory, InvalidProductCategoryError } from '../value-object/product-category-value-object.js';

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  mobileImageUrl: string;
  imageAlt?: string;
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
  private imageUrlValue: string;
  private mobileImageUrlValue: string;
  private imageAltValue: string;

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
    if (props.id.trim().length > 255 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(props.id.trim())) {
      throw new InvalidProductError('O identificador do produto deve estar em kebab-case e ter no máximo 255 caracteres.');
    }

    this.validateName(props.name);
    this.validatePrice(props.price);
    this.validateImages(props.imageUrl, props.mobileImageUrl);
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
    this.imageUrlValue = props.imageUrl.trim();
    this.mobileImageUrlValue = props.mobileImageUrl.trim();
    this.imageAltValue = props.imageAlt?.trim() || this.nameValue;
    this.isActiveValue = props.isActive ?? true;
    this.createdAtValue = new Date(props.createdAt);
    this.updatedAtValue = new Date(props.updatedAt);
  }

  get name(): string { return this.nameValue; }
  get imageUrl(): string { return this.imageUrlValue; }
  get mobileImageUrl(): string { return this.mobileImageUrlValue; }
  get imageAlt(): string { return this.imageAltValue; }
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

  changeImages(imageUrl: string, mobileImageUrl: string): void {
    this.validateImages(imageUrl, mobileImageUrl);
    this.imageUrlValue = imageUrl.trim();
    this.mobileImageUrlValue = mobileImageUrl.trim();
    this.touch();
  }

  changeImageAlt(imageAlt: string): void {
    this.imageAltValue = imageAlt.trim() || this.nameValue;
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
    if ([...name.trim()].length > 255) {
      throw new InvalidProductError('O nome do produto deve ter no máximo 255 caracteres.');
    }
  }

  private validateImages(imageUrl: string, mobileImageUrl: string): void {
    if (!imageUrl.trim() || !mobileImageUrl.trim()) {
      throw new InvalidProductError('As imagens do produto não podem ser vazias.');
    }
  }

  private validatePrice(price: number): void {
    if (!Number.isFinite(price) || price < 0) {
      throw new InvalidProductError('O preço do produto deve ser um número finito não negativo.');
    }
    if (price > 99_999_999.99) {
      throw new InvalidProductError('O preço do produto não pode ultrapassar 99999999.99.');
    }
    // Compare with the cent value instead of requiring price * 100 to be an integer.
    if (Math.round(price * 100) / 100 !== price) {
      throw new InvalidProductError('O preço do produto deve ter no máximo duas casas decimais.');
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
