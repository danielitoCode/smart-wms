import type {FraudReviewRepository} from "#core/feature/fraud/domain/repository/FraudReviewRepositoy.ts";
import type {FraudReview} from "#core/feature/fraud/domain/entity/FraudReview.ts";

export class GetAllFraudReviewUseCase {
    constructor(private readonly repository: FraudReviewRepository) {}

    execute(): Promise<FraudReview[]> {
        return this.repository.getAllFraudReview()
    }
}