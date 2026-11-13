import type { CreateRmaInput, ReceiveReturnInput } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class CreateSalesOrderRmaUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number, input: CreateRmaInput): Promise<void> {
    validateOrderId(id);
    if (!input.lines.length) throw new Error('Selecciona al menos una línea para devolver');
    for (const line of input.lines) {
      if (![line.itemId, line.quantity].every((value) => Number.isInteger(value) && value > 0)) {
        throw new Error('Cada línea de devolución requiere artículo y cantidad positivos');
      }
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
