import type { InterWarehouseTransfer, RecordInterWarehouseTransfer } from '../../domain/entity/InterWarehouseTransfer';
import type { InterWarehouseTransfersRepository } from '../../domain/repository/InterWarehouseTransfersRepository';
import type { InterWarehouseTransfersRemoteDataSource } from '../datasource/InterWarehouseTransfersRemoteDataSource';
import { InterWarehouseTransferMapper as M } from '../mapper/InterWarehouseTransferMapper';

export class InterWarehouseTransfersRepositoryImpl implements InterWarehouseTransfersRepository {
  constructor(private readonly remote: InterWarehouseTransfersRemoteDataSource) {}
  async list(limit?: number): Promise<InterWarehouseTransfer[]> {
    return (await this.remote.list(limit)).map(M.toDomain);
  }
  async create(input: RecordInterWarehouseTransfer): Promise<void> {
    // Flask returns a mutation receipt, not a complete transfer-list DTO.
    await this.remote.create(M.toCreateDto(input));
  }
}