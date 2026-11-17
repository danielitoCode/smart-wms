import type { InterWarehouseTransfer, RecordInterWarehouseTransfer, InterWarehouseTransferListFilters } from '../entity/InterWarehouseTransfer';
export interface InterWarehouseTransfersRepository {
  list(limit?: number, filters?: Omit<InterWarehouseTransferListFilters, 'limit'>): Promise<InterWarehouseTransfer[]>;
  create(input: RecordInterWarehouseTransfer): Promise<void>;
}
