import type {BackordersRepository} from "#core/feature/backorders/domain/repository/BackordersRepository.ts";
import type {Backorder} from "#core/feature/backorders/domain/entity/Backorder.ts";

export class GetAllBackOrdersUseCase {
    constructor(private readonly repository: BackordersRepository) {}

    async execute(): Promise<Backorder[]> {
        return this.repository.getAllBackorder()
    }
}