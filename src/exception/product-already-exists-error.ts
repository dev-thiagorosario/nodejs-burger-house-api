export class ProductAlreadyExistsError extends Error {
  constructor() {
    super('Já existe um produto cadastrado com este identificador.');
    this.name = 'ProductAlreadyExistsError';
  }
}
