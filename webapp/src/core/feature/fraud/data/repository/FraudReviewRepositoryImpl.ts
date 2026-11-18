import type { FraudReview, FraudReviewDetail } from '../../domain/entity/FraudReview';
import type { FraudReviewRepository } from '../../domain/repository/FraudReviewRepository';
import type { FraudReviewRemoteDataSource } from '../datasource/FraudReviewRemoteDataSource';
import { FraudReviewMapper } from '../mapper/FraudReviewMapper';

export class FraudReviewRepositoryImpl implements FraudReviewRepository {
  constructor(private readonly remote: FraudReviewRemoteDataSource) {}

  async list(warehouseId: number, query = ''): Promise<FraudReview[]> {
    const rows = await this.remote.list(warehouseId, query);
    return rows.map(FraudReviewMapper.toDomain);
  }

  async getDetail(id: number): Promise<FraudReviewDetail> {
    return FraudReviewMapper.toDetail(await this.remote.getDetail(id));
  }

  updateMemo(id: number, memo: string): Promise<void> {
    return this.remote.updateMemo(id, memo);
  }

  pushToQueue(id: number): Promise<void> {
    return this.remote.pushToQueue(id);
  }
}
