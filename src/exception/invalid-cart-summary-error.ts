export class InvalidCartSummaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCartSummaryError';
  }
}
