import type {
  FraudAuditHistoryPage,
  FraudReviewDetail,
  FraudReviewPage
} from '../../domain/entity/FraudReview';
import type { FraudReviewRepository } from '../../domain/repository/FraudReviewRepository';
import type { FraudReviewRemoteDataSource } from '../datasource/FraudReviewRemoteDataSource';
import { FraudReviewMapper } from '../mapper/FraudReviewMapper';

export class FraudReviewRepositoryImpl implements FraudReviewRepository {
  constructor(private readonly remote: FraudReviewRemoteDataSource) {}

  async list(warehouseId: number, query = '', page = 1): Promise<FraudReviewPage> {
    return FraudReviewMapper.toPage(await this.remote.list(warehouseId, query, page));
  }

  async getDetail(id: number): Promise<FraudReviewDetail> {
    return FraudReviewMapper.toDetail(await this.remote.getDetail(id));
  }

  async getAuditHistory(id: number, page = 1): Promise<FraudAuditHistoryPage> {
    return FraudReviewMapper.toAuditHistory(await this.remote.getAuditHistory(id, page));
  }

  updateMemo(id: number, memo: string, expectedMemo: string | null): Promise<void> {
    return this.remote.updateMemo(id, memo, expectedMemo);
  }

  pushToQueue(id: number): Promise<void> {
    return this.remote.pushToQueue(id);
  }
}
