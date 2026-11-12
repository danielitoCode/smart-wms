import type {BackordersRepository} from "#core/feature/backorders/domain/repository/BackordersRepository.ts";
import type {Backorder} from "#core/feature/backorders/domain/entity/Backorder.ts";

export class SaveBackorderUseCase {
    constructor(private readonly repository: BackordersRepository) {}

    async execute(backorder: Backorder) {
        if (backorder === null) return
        if (backorder.warehouseId === null) return
        await this.repository.saveBackorder(backorder)
    }
}