export class ProductNotAvailableError extends Error {
  constructor() {
    super('Produto indisponível para compra.');
    this.name = 'ProductNotAvailableError';
  }
}
