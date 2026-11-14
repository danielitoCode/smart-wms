import type { OperationalBinSearchResult } from '../entity/Warehouse';
import type { BinLookupRepository } from '../repository/BinLookupRepository';

export class SearchBinsUseCase {
	constructor(private readonly repository: BinLookupRepository) {}

	async execute(query: string): Promise<OperationalBinSearchResult[]> {
		const normalized = query.trim();
		if (!normalized) return [];
		if (normalized.length > 128) throw new Error('bin search query cannot exceed 128 characters');
		return this.repository.searchOperationalBins(normalized);
	}
}
