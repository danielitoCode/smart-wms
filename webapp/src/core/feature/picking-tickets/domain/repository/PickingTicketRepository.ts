import type { MarkPrintedResult, PickingTicket } from '../entity/PickingTicket';
export interface PickingTicketRepository {
  getTicket(salesOrderId: number): Promise<PickingTicket>;
  markPrinted(salesOrderIds: number[]): Promise<MarkPrintedResult>;
}
