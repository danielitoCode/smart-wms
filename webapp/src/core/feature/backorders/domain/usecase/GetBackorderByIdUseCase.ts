import type {BackordersRepository} from "#core/feature/backorders/domain/repository/BackordersRepository.ts";
import type {Backorder} from "#core/feature/backorders/domain/entity/Backorder.ts";

export class GetBackorderByIdUseCase {
    constructor(private readonly repository: BackordersRepository) {}

    execute(backorderId: number): Promise<Backorder | null> {
        if(backorderId === null) throw new Error('backorderId must be valid number');
        return this.repository.getBackorderById(backorderId)
    }
}