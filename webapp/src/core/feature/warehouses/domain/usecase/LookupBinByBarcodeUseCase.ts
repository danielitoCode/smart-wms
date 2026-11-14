import type { OperationalBinLookup } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';

export class LookupBinByBarcodeUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}

	async execute(barcode: string): Promise<OperationalBinLookup> {
		const normalized = barcode.trim();
		if (!normalized) throw new Error('bin barcode is required');
		if (normalized.length > 128) throw new Error('bin barcode cannot exceed 128 characters');
		return this.repository.lookupOperationalBin(normalized);
	}
}
