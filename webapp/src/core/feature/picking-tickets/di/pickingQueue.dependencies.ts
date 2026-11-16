import { createSalesOrdersDependencies } from '#core/feature/sales-orders/di/sales-orders.dependencies';
import { GetAllPrintableTicketsUseCase } from '../domain/usecase/GetAllPrintableTicketsUseCase';
export function createPickingQueueDependencies() {
  const salesOrders = createSalesOrdersDependencies();
  return { getAllPrintableTickets: new GetAllPrintableTicketsUseCase(salesOrders.listSalesOrders) };
}
