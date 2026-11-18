import type { SalesOrder, SalesOrderPage } from '#core/feature/sales-orders/domain/entity/SalesOrder';
import type { ListSalesOrdersUseCase } from '#core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
export interface PrintableQueueFilters { warehouseId?: number; status?: 'OPEN' | 'PICKED' | 'ALL'; hidePrinted?: boolean; }
export class GetAllPrintableTicketsUseCase {
  constructor(private readonly listSalesOrders: ListSalesOrdersUseCase) {}
  execute(filters: PrintableQueueFilters = {}): Promise<SalesOrderPage> {
    if (filters.warehouseId != null && (!Number.isInteger(filters.warehouseId) || filters.warehouseId < 1)) {
      throw new Error('warehouseId debe ser un entero positivo');
    }
    const status = filters.status === 'ALL' ? 'OPEN,PICKED' : (filters.status ?? 'OPEN');
    return this.listSalesOrders.execute({
      status, warehouseId: filters.warehouseId, page: 1, perPage: 1000,
      hidePrinted: filters.hidePrinted ?? true, includePrimaryBin: true, includeLineCount: true
    });
  }
}
export type PrintableTicketOrder = Pick<SalesOrder,
  'salesOrderId' | 'salesOrderNumber' | 'customerName' | 'status' | 'warehouseId' |
  'shipMethod' | 'shipByDate' | 'printedAt' | 'primaryBinCode' | 'primaryBinPickSequence' | 'lineCount'
>;
