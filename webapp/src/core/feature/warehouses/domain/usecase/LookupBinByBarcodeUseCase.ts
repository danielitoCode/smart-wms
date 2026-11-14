import type { OperationalBinLookup } from '../entity/Warehouse';
import type { BinLookupRepository } from '../repository/BinLookupRepository';

export class LookupBinByBarcodeUseCase {
	constructor(private readonly repository: BinLookupRepository) {}

	async execute(barcode: string): Promise<OperationalBinLookup> {
		const normalized = barcode.trim();
		if (!normalized) throw new Error('bin barcode is required');
		if (normalized.length > 100) throw new Error('bin barcode cannot exceed 100 characters');
		return this.repository.lookupOperationalBin(normalized);
	}
}
