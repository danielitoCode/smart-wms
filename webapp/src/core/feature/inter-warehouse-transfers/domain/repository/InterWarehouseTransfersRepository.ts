import type { InterWarehouseTransfer, RecordInterWarehouseTransfer } from '../entity/InterWarehouseTransfer';
import type { InterWarehouseTransferListFilters } from '../usecase/InterWarehouseTransferUseCases';
export interface InterWarehouseTransfersRepository {
  list(limit?: number, filters?: Omit<InterWarehouseTransferListFilters, 'limit'>): Promise<InterWarehouseTransfer[]>;
  create(input: RecordInterWarehouseTransfer): Promise<void>;
}
