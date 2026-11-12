import type {FraudReviewRepository} from "#core/feature/fraud/domain/repository/FraudReviewRepositoy.ts";
import type {FraudReview} from "#core/feature/fraud/domain/entity/FraudReview.ts";

export class GetFraudReviewByIdUseCase {
    constructor(private readonly repository: FraudReviewRepository) {}

    execute(fraudReviewId: number): Promise<FraudReview> {
        if (fraudReviewId === null) throw new Error("The FraudReview ID cant be null")
        return this.repository.getFraudReviewById(fraudReviewId)
    }
}