import type { OperationalBinSearchResult } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';

export class SearchBinsUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}

	async execute(query: string): Promise<OperationalBinSearchResult[]> {
		const normalized = query.trim();
		if (!normalized) return [];
		if (normalized.length > 128) throw new Error('bin search query cannot exceed 128 characters');
		return this.repository.searchOperationalBins(normalized);
	}
}
