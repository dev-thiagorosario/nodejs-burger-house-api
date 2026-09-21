export class ForbiddenOrderStatusUpdateError extends Error {
  constructor() {
    super('Apenas administradores podem atualizar o status dos pedidos.');
    this.name = 'ForbiddenOrderStatusUpdateError';
  }
}
