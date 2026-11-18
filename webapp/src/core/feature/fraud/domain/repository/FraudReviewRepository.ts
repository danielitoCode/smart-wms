import type {
  FraudAuditHistoryPage,
  FraudReview,
  FraudReviewDetail,
  FraudReviewPage
} from '../entity/FraudReview';

export interface FraudReviewRepository {
  list(warehouseId: number, query?: string, page?: number): Promise<FraudReviewPage>;
  getDetail(id: number): Promise<FraudReviewDetail>;
  getAuditHistory(id: number, page?: number): Promise<FraudAuditHistoryPage>;
  updateMemo(id: number, memo: string, expectedMemo: string | null): Promise<void>;
  pushToQueue(id: number): Promise<void>;
}
