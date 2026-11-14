import { canSubmitCycleCount } from '../entity/CycleCount';
import type { CycleCountSubmitLine, CycleCountSubmitResult } from '../entity/CycleCount';
import type { InventoryRepository } from '../repository/InventoryRepository';

export class SubmitCycleCountUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	async execute(countId: number, lines: CycleCountSubmitLine[]): Promise<CycleCountSubmitResult> {
		if (!Number.isInteger(countId) || countId <= 0) {
			throw new Error('countId must be a positive integer');
		}
		if (!Array.isArray(lines) || lines.length === 0) {
			throw new Error('lines must not be empty');
		}

		const normalLineIds = new Set<number>();
		const unexpectedItemIds = new Set<number>();

		for (const line of lines) {
			if (!Number.isInteger(line.countedQuantity) || line.countedQuantity < 0 || line.countedQuantity > 1_000_000) {
				throw new Error('countedQuantity must be an integer between 0 and 1000000');
			}

			if ('unexpected' in line && line.unexpected === true) {
				if (!Number.isInteger(line.itemId) || line.itemId <= 0) {
					throw new Error('itemId must be a positive integer for unexpected lines');
				}
				if (line.sku != null && line.sku.length > 128) {
					throw new Error('sku must not exceed 128 characters');
				}
				if (unexpectedItemIds.has(line.itemId)) {
					throw new Error('unexpected lines must not contain duplicate itemIds');
				}
				unexpectedItemIds.add(line.itemId);
				continue;
			}

			if (!Number.isInteger(line.countLineId) || line.countLineId <= 0) {
				throw new Error('countLineId must be a positive integer');
			}
			if (normalLineIds.has(line.countLineId)) {
				throw new Error('lines must not contain duplicate countLineIds');
			}
			normalLineIds.add(line.countLineId);
		}

		// Read the persisted state before sending: only open counts are submittable.
		const detail = await this.repository.getCycleCount(countId);
		const snapshotItemIds = new Set(detail.lines.map((line) => line.itemId));
		for (const itemId of unexpectedItemIds) {
			if (snapshotItemIds.has(itemId)) {
				throw new Error('unexpected itemIds must not duplicate items already present in the count snapshot');
			}
		}
		if (!canSubmitCycleCount(detail.status)) {
			throw new Error(`Cycle count status is ${detail.status}, cannot submit`);
		}

		return this.repository.submitCycleCount(countId, lines);
	}
}
