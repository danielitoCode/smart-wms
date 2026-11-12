import type {FraudReviewRepository} from "#core/feature/fraud/domain/repository/FraudReviewRepositoy.ts";
import type {FraudReview} from "#core/feature/fraud/domain/entity/FraudReview.ts";

export class SaveFraudReviewUseCase {
    constructor(private readonly repository: FraudReviewRepository) {}

    async execute(fraudReview: FraudReview) {
        if (fraudReview === null) throw new  Error("Your new FraudReview cant be null ")
        if (fraudReview.customerName === null || fraudReview.customerName === "") throw new  Error("A FraudReview Customer name cant be null or empty")
        if (fraudReview.warehouseId === null) throw new Error("The FraudReview warenhouse Id cant be null or empty")
        await this.repository.saveFraudReview(fraudReview)
    }
}