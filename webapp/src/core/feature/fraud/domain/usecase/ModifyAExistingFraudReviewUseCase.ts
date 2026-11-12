import type {FraudReviewRepository} from "#core/feature/fraud/domain/repository/FraudReviewRepositoy.ts";
import type {FraudReview} from "#core/feature/fraud/domain/entity/FraudReview.ts";

export class ModifyAExistingFraudReviewUseCase {
    constructor(private readonly repository: FraudReviewRepository) {}

    async execute(fraudReview: FraudReview) {
        if (fraudReview === null) throw new Error("A new FraudReview cant be null")
        if (fraudReview.warehouseId === null) throw new Error("A FraudReview warenhouse Id cant be null")
        if (fraudReview.customerName === null || fraudReview.customerName === "") throw new  Error("A FraudReview Customer name cant be null or empty")
        await this.repository.modifyFraudReview(fraudReview)


    }
}