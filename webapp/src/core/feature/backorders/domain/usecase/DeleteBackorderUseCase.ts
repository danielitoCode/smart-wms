import type {BackordersRepository} from "#core/feature/backorders/domain/repository/BackordersRepository.ts";

export class DeleteBackorderUseCase {
    constructor(private readonly repository: BackordersRepository) {}

    async execute(backorderId: number) {
        if (backorderId === null) return
        await this.repository.deleteBackorder(backorderId)
    }
}