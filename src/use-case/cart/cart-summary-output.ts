export interface CartSummaryOutput {
  items: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  totalItems: number;
  total: number;
}
