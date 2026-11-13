import type { SalesOrderListQuery, SalesOrderPage } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class ListSalesOrdersUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(query: SalesOrderListQuery = {}): Promise<SalesOrderPage> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 50;
    if (!Number.isInteger(page) || page < 1) throw new Error('La página debe ser un entero positivo');
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) {
      throw new Error('El tamaño de página debe estar entre 1 y 1000');
    }
    return this.repository.list({ ...query, search: query.search?.trim(), page, perPage });
  }
}
