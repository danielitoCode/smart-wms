import type { PreferredBin, PreferredBinCandidate, PreferredBinListQuery } from '../entity/PreferredBin';

export interface PreferredBinsRepository {
	list(query?: PreferredBinListQuery): Promise<PreferredBin[]>;
	create(input: PreferredBinCandidate): Promise<void>;
	update(id: number, priority: number): Promise<void>;
	remove(id: number): Promise<void>;
}
