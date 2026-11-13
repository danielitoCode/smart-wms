import type { PartialFulfillInput, RevertSalesOrderInput } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class AdminShipSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number): Promise<void> {
    validateOrderId(id);
    return this.repository.adminShip(id);
  }
}

export class PartialFulfillSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number, input: PartialFulfillInput): Promise<void> {
    validateOrderId(id);
    if (!input.lines.length) throw new Error('Indica al menos una línea con faltante');
    for (const line of input.lines) {
      if (!Number.isInteger(line.soLineId) || line.soLineId < 1 || !Number.isInteger(line.shortQuantity) || line.shortQuantity < 1) {
        throw new Error('Las líneas y cantidades de faltantes deben ser positivas');
      }
    }
    return this.repository.partialFulfill(id, input);
  }
}

export class AdminPickSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number, lines: Array<{ soLineId: number; binId: number; quantity: number }>): Promise<void> {
    validateOrderId(id);
    if (!lines.length) throw new Error('Añade al menos una asignación de picking');
    for (const line of lines) {
      if (![line.soLineId, line.binId, line.quantity].every((value) => Number.isInteger(value) && value > 0)) {
        throw new Error('Cada operación de picking requiere línea, ubicación y cantidad válidas');
      }
    }
    return this.repository.adminPick(id, lines);
  }
}

export class RevertSalesOrderStatusUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}
  execute(id: number, input: RevertSalesOrderInput): Promise<void> {
    validateOrderId(id);
    if (!input.newStatus.trim()) throw new Error('Selecciona el estado de destino');
    if (input.releasePickTaskIds.some((taskId) => !Number.isInteger(taskId) || taskId < 1)) {
      throw new Error('La selección de tareas de picking no es válida');
    }
    return this.repository.revertStatus(id, input);
  }
}

function validateOrderId(id: number): void {
  if (!Number.isInteger(id) || id < 1) throw new Error('El identificador del pedido no es válido');
}
