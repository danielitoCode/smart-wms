import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class AddSalesOrderLineUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number, itemId: number, quantity: number): Promise<void> {
    validateIds(id, itemId);
    validateQuantity(quantity);
    return this.repository.addLine(id, { itemId, quantityOrdered: quantity });
  }
}

export class UpdateSalesOrderLineUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number, lineId: number, quantity: number): Promise<void> {
    validateIds(id, lineId);
    validateQuantity(quantity);
    return this.repository.updateLine(id, lineId, quantity);
  }
}

export class DeleteSalesOrderLineUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number, lineId: number): Promise<void> {
    validateIds(id, lineId);
    return this.repository.deleteLine(id, lineId);
  }
}

function validateIds(orderId: number, lineOrItemId: number): void {
  if (!Number.isInteger(orderId) || orderId < 1 || !Number.isInteger(lineOrItemId) || lineOrItemId < 1) {
    throw new Error('Los identificadores del pedido y del artículo deben ser positivos');
  }
}

function validateQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
    throw new Error('La cantidad debe estar entre 1 y 1 000 000');
  }
}
