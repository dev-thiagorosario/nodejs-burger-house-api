export interface OrderItemProps {
  id: number;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export class InvalidOrderItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderItemError';
  }
}

/** Snapshot comercial imutável de uma linha do pedido. */
export class OrderItem {
  public readonly id: number;
  public readonly productId: string;
  public readonly productName: string;
  public readonly quantity: number;
  public readonly unitPrice: number;
  private readonly subtotalCentsValue: number;

  constructor(props: OrderItemProps) {
    if (!Number.isSafeInteger(props.id) || props.id <= 0) {
      throw new InvalidOrderItemError('O identificador do item deve ser um inteiro positivo.');
    }
    if (!props.productId.trim() || !props.productName.trim()) {
      throw new InvalidOrderItemError('O item deve possuir identificador de produto e nome.');
    }
    if (!Number.isSafeInteger(props.quantity) || props.quantity < 1) {
      throw new InvalidOrderItemError('A quantidade deve ser um inteiro maior ou igual a um.');
    }
    const cents = Math.round(props.unitPrice * 100);
    if (
      !Number.isFinite(props.unitPrice) || props.unitPrice < 0 ||
      !Number.isSafeInteger(cents) ||
      Math.abs(props.unitPrice - cents / 100) > Number.EPSILON * Math.abs(props.unitPrice)
    ) {
      throw new InvalidOrderItemError('O preço unitário deve ser não negativo e possuir até duas casas decimais.');
    }
    const subtotalCents = cents * props.quantity;
    if (!Number.isSafeInteger(subtotalCents)) {
      throw new InvalidOrderItemError('O subtotal do item excede o limite suportado.');
    }
    this.id = props.id;
    this.productId = props.productId.trim();
    this.productName = props.productName.trim();
    this.quantity = props.quantity;
    this.unitPrice = cents / 100;
    this.subtotalCentsValue = subtotalCents;
    Object.freeze(this);
  }

  get subtotal(): number {
    return this.getSubtotal();
  }

  get subtotalCents(): number {
    return this.subtotalCentsValue;
  }

  getSubtotal(): number {
    return this.subtotalCentsValue / 100;
  }
}
