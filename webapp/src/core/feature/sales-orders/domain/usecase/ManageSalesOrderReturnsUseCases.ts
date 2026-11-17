import type { CreateRmaInput, ReceiveReturnInput } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class CreateSalesOrderRmaUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number, input: CreateRmaInput): Promise<void> {
    validateOrderId(id);
    if (!input.lines.length) throw new Error('Selecciona al menos una línea para devolver');
    const sourceLineIds = new Set<number>();
    for (const line of input.lines) {
      if (![line.itemId, line.quantity, line.originalSoLineId].every((value) => Number.isInteger(value) && value > 0)) {
        throw new Error('Cada autorización requiere artículo, línea original y cantidad positivos');
      }
      if (sourceLineIds.has(line.originalSoLineId)) {
        throw new Error('No se puede duplicar una línea original en la misma autorización RMA');
      }
      sourceLineIds.add(line.originalSoLineId);
    }
    if (input.reason != null && input.reason.length > 4000) {
      throw new Error('El motivo del RMA supera los 4000 caracteres');
    }
    return this.repository.createRma(id, input);
  }
}

export class ReceiveSalesOrderReturnUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number, input: ReceiveReturnInput): Promise<void> {
    validateOrderId(id);
    if (![input.itemId, input.quantity, input.warehouseId, input.binId].every((value) => Number.isInteger(value) && value > 0)) {
      throw new Error('Artículo, cantidad, almacén y ubicación son obligatorios');
    }
    return this.repository.receiveReturn(id, input);
  }
}

export class VoidSalesOrderReturnUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number): Promise<void> {
    validateOrderId(id);
    return this.repository.voidReturn(id);
  }
}

function validateOrderId(id: number): void {
  if (!Number.isInteger(id) || id < 1) throw new Error('El identificador del pedido no es válido');
}
