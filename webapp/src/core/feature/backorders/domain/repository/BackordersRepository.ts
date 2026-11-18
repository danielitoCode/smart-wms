import type {
  Backorder, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../entity/Backorder';

export interface BackordersRepository {
  list(warehouseId: number | null, tab: BackorderQueueTab): Promise<Backorder[]>;
  getDetail(backorderId: number): Promise<BackorderDetail>;
  cancel(backorderId: number, reason: CancelBackorderReason): Promise<void>;
}
