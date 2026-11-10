import type { WaveValidateResult } from '../entity/Picking';
import type { PickingRepository } from '../repository/PickingRepository';

export class WaveValidateUseCase {
	constructor(private readonly repository: PickingRepository) {}

	execute(soBarcode: string, warehouseId: number): Promise<WaveValidateResult> {
		const code = soBarcode?.trim() ?? '';
		if (!code) throw new Error('so_barcode is required');
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouse_id must be a positive integer');
		}
		return this.repository.waveValidate(code, warehouseId);
	}
}
