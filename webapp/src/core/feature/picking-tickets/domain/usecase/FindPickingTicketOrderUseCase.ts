import type { SalesOrderPage } from '#core/feature/sales-orders/domain/entity/SalesOrder';
import type { ListSalesOrdersUseCase } from '#core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
export class FindPickingTicketOrderUseCase {
  constructor(private readonly listSalesOrders: ListSalesOrdersUseCase) {}
  execute(term: string): Promise<SalesOrderPage> {
    const query = term.trim();
    if (!query) throw new Error('Introduce un número de pedido o cliente');
    return this.listSalesOrders.execute({ q: query, page: 1, perPage: 10 });
  }
}
