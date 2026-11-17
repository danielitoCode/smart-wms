import type { OperationalBinSearchResult } from '../entity/Warehouse';
import type { BinLookupRepository } from '../repository/BinLookupRepository';

export class SearchBinsUseCase {
	constructor(private readonly repository: BinLookupRepository) {}

	async execute(query: string, warehouseId?: number): Promise<OperationalBinSearchResult[]> {
		const normalized = query.trim();
		if (!normalized) return [];
		if (normalized.length > 128) throw new Error('bin search query cannot exceed 128 characters');
		if (warehouseId !== undefined && (!Number.isSafeInteger(warehouseId) || warehouseId <= 0)) throw new Error('warehouse ID must be a positive integer');
		return this.repository.searchOperationalBins(normalized, warehouseId);
	}
}
