import { createSalesOrdersDependencies } from '#core/feature/sales-orders/di/sales-orders.dependencies';
import { GetAllPrintableTicketsUseCase } from '../domain/usecase/GetAllPrintableTicketsUseCase';
import { FindPickingTicketOrderUseCase } from '../domain/usecase/FindPickingTicketOrderUseCase';
export function createPickingQueueDependencies() {
  const salesOrders = createSalesOrdersDependencies();
  return {
    getAllPrintableTickets: new GetAllPrintableTicketsUseCase(salesOrders.listSalesOrders),
    findOrder: new FindPickingTicketOrderUseCase(salesOrders.listSalesOrders)
  };
}
