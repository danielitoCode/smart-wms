import type {FraudReviewRepository} from "#core/feature/fraud/domain/repository/FraudReviewRepositoy.ts";

export class DeleteFraudReviewUseCase {
    constructor(private readonly repository: FraudReviewRepository) {}

    async execute(fraudReviewId: number) {
        if (fraudReviewId === null) throw new Error("FraudReview Id cant be null")
        await this.repository.deleteFraudReview(fraudReviewId)
    }
}