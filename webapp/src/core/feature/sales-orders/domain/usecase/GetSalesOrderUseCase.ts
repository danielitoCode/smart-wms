import type { SalesOrder } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class GetSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number): Promise<SalesOrder> {
    if (!Number.isInteger(id) || id < 1) throw new Error('El identificador del pedido no es válido');
    return this.repository.getById(id);
  }
}
