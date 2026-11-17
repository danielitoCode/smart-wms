import type { InterWarehouseTransfer, RecordInterWarehouseTransfer } from '../../domain/entity/InterWarehouseTransfer';
import type { InterWarehouseTransferListFilters } from '../../domain/usecase/InterWarehouseTransferUseCases';
import type { InterWarehouseTransfersRepository } from '../../domain/repository/InterWarehouseTransfersRepository';
import type { InterWarehouseTransfersRemoteDataSource } from '../datasource/InterWarehouseTransfersRemoteDataSource';
import { InterWarehouseTransferMapper as M } from '../mapper/InterWarehouseTransferMapper';

export class InterWarehouseTransfersRepositoryImpl implements InterWarehouseTransfersRepository {
  constructor(private readonly remote: InterWarehouseTransfersRemoteDataSource) {}
  async list(limit?: number, filters: Omit<InterWarehouseTransferListFilters, 'limit'> = {}): Promise<InterWarehouseTransfer[]> {
    return (await this.remote.list(limit, filters)).map(M.toDomain);
  }
  async create(input: RecordInterWarehouseTransfer): Promise<void> {
    await this.remote.create(M.toCreateDto(input));
  }
}
