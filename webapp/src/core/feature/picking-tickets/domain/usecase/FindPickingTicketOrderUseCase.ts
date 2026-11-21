import type { SalesOrderPage } from '#core/feature/sales-orders/domain/entity/SalesOrder';
import type { ListSalesOrdersUseCase } from '#core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
export class FindPickingTicketOrderUseCase {
  constructor(private readonly listSalesOrders: ListSalesOrdersUseCase) {}
  execute(term: string, warehouseId: number): Promise<SalesOrderPage> {
    const query = term.trim();
    if (!query) throw new Error('Introduce un número de pedido o cliente');
    if (!Number.isInteger(warehouseId) || warehouseId < 1) throw new Error('Selecciona un almacén válido');
    return this.listSalesOrders.execute({ q: query, warehouseId, page: 1, perPage: 10 });
  }
}
