export interface Category {
  id: number;
  name: string;
}

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
}
