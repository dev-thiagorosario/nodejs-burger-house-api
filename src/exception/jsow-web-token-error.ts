export class JsonWebTokenError extends Error {
  constructor() {
    super('Token inválido ou expirado.');
    this.name = 'JsonWebTokenError';
  }
}
