import type { PackingOrderDetail } from '../entity/Packing';
import type { PackingRepository } from '../repository/PackingRepository';

export class LoadPackingOrderUseCase {
	constructor(private readonly repository: PackingRepository) {}

	execute(barcode: string, warehouseId: number): Promise<PackingOrderDetail> {
		const code = barcode?.trim() ?? '';
		if (!code) throw new Error('barcode is required');
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) throw new Error('warehouseId is required');
		return this.repository.loadOrder(code, warehouseId);
	}
}
