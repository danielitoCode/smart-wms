import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class CancelSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number): Promise<void> {
    if (!Number.isInteger(id) || id < 1) throw new Error('El identificador del pedido no es válido');
    return this.repository.cancel(id);
  }
}
