import type { CreateBatchResult } from '../entity/Picking';
import type { PickingRepository } from '../repository/PickingRepository';

/**
 * POST /api/picking/create-batch
 * so_identifiers (SO numbers/barcodes) + warehouse_id
 */
export class CreateBatchUseCase {
	constructor(private readonly repository: PickingRepository) {}

	execute(soIdentifiers: string[], warehouseId: number): Promise<CreateBatchResult> {
		const ids = (soIdentifiers ?? [])
			.map((s) => s?.trim())
			.filter((s): s is string => Boolean(s));
		if (ids.length === 0) {
			throw new Error('so_identifiers must contain at least one SO number or barcode');
		}
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouse_id must be a positive integer');
		}
		return this.repository.createBatch(ids, warehouseId);
	}
}
