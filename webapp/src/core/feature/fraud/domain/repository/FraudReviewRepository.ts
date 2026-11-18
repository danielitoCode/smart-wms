import type { FraudReview, FraudReviewDetail } from '../entity/FraudReview';

export interface FraudReviewRepository {
  list(warehouseId: number, query?: string): Promise<FraudReview[]>;
  getDetail(id: number): Promise<FraudReviewDetail>;
  updateMemo(id: number, memo: string): Promise<void>;
  pushToQueue(id: number): Promise<void>;
}
