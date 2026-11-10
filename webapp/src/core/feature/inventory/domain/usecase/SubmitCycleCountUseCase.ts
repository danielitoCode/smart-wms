import type { CycleCountSubmitLine, CycleCountSubmitResult } from '../entity/CycleCount';
import type { InventoryRepository } from '../repository/InventoryRepository';

export class SubmitCycleCountUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(countId: number, lines: CycleCountSubmitLine[]): Promise<CycleCountSubmitResult> {
		if (!Number.isInteger(countId) || countId <= 0) {
			throw new Error('countId must be a positive integer');
		}
		if (!Array.isArray(lines) || lines.length === 0) {
			throw new Error('lines must not be empty');
		}
		for (const line of lines) {
			if (!Number.isInteger(line.countLineId) || line.countLineId <= 0) {
				throw new Error('countLineId must be a positive integer');
			}
			if (!Number.isInteger(line.countedQuantity) || line.countedQuantity < 0) {
				throw new Error('countedQuantity must be an integer >= 0');
			}
		}
		return this.repository.submitCycleCount(countId, lines);
	}
}
