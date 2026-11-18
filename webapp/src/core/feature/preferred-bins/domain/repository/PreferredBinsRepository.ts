import type { PreferredBin, PreferredBinCandidate, PreferredBinCatalog, PreferredBinCatalogQuery, PreferredBinListQuery } from '../entity/PreferredBin';

export interface PreferredBinsRepository {
	list(query?: PreferredBinListQuery): Promise<PreferredBin[]>;
	listCatalog(query?: PreferredBinCatalogQuery): Promise<PreferredBinCatalog>;
	create(input: PreferredBinCandidate): Promise<void>;
	update(id: number, priority: number): Promise<void>;
	remove(id: number): Promise<void>;
}
