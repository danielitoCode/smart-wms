import type { RelatedSalesOrder } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class GetRelatedSalesOrdersUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number): Promise<RelatedSalesOrder[]> {
    if (!Number.isInteger(id) || id < 1) {
      throw new Error('El identificador del pedido no es válido');
    }
    return this.repository.related(id);
  }
}
