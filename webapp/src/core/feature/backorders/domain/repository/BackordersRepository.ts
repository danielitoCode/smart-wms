import type {
  Backorder, BackorderAuditHistoryPage, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../entity/Backorder';

export interface BackordersRepository {
  list(warehouseId: number | null, tab: BackorderQueueTab): Promise<Backorder[]>;
  getDetail(backorderId: number): Promise<BackorderDetail>;
  auditHistory(backorderId: number, page: number): Promise<BackorderAuditHistoryPage>;
  cancel(backorderId: number, reason: CancelBackorderReason): Promise<void>;
}
