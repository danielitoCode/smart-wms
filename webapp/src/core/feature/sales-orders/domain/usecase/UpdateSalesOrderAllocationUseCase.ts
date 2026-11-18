import type { UpdateSalesOrderAllocationInput, UpdateSalesOrderAllocationResult } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

/** Adjusts the standing reservation without pretending the requested delta was fully achievable. */
export class UpdateSalesOrderAllocationUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(orderId: number, lineId: number, input: UpdateSalesOrderAllocationInput): Promise<UpdateSalesOrderAllocationResult> {
    if (!Number.isInteger(orderId) || orderId < 1) {
      throw new Error('El identificador del pedido no es válido');
    }
    if (!Number.isInteger(lineId) || lineId < 1) {
      throw new Error('El identificador de la línea no es válido');
    }
    if (!Number.isInteger(input.delta) || input.delta < -1_000_000 || input.delta > 1_000_000) {
      throw new Error('El ajuste de asignación debe ser un entero entre -1 000 000 y 1 000 000');
    }
    return this.repository.updateAllocation(orderId, lineId, input);
  }
}
