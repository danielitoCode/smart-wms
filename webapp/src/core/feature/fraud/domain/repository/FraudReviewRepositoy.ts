import type {FraudReview} from "#core/feature/fraud/domain/entity/FraudReview.ts";

export interface FraudReviewRepository {
    getAllFraudReview(): Promise<FraudReview[]>
    getFraudReviewById(fraudReviewId: number): Promise<FraudReview>
    deleteFraudReview(fraudReviewId: number): Promise<void>
    modifyFraudReview(fraudReview: FraudReview): Promise<void>
    saveFraudReview(fraudReview: FraudReview): Promise<void>
}