import type { SalesOrderShortPick } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class ListSalesOrderShortPicksUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(days = 30, warehouseId?: number): Promise<SalesOrderShortPick[]> {
    if (!Number.isInteger(days) || days < 1) {
      throw new Error('El período de consulta debe ser un número positivo de días');
    }
    if (warehouseId !== undefined && (!Number.isInteger(warehouseId) || warehouseId < 1)) {
      throw new Error('El identificador del almacén no es válido');
    }
    return this.repository.listShortPicks(days, warehouseId);
  }
}
