import type { FraudReview } from '../entity/FraudReview';

export interface FraudReviewRepository {
  list(warehouseId: number, query?: string): Promise<FraudReview[]>;
  updateMemo(id: number, memo: string): Promise<void>;
  pushToQueue(id: number): Promise<void>;
}
