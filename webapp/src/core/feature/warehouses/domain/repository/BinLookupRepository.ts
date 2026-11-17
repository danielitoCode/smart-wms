import type { OperationalBinLookup, OperationalBinSearchResult } from '../entity/Warehouse';

/** Operational scanner/search contract; intentionally separate from the admin bin catalogue. */
export interface BinLookupRepository {
	searchOperationalBins(query: string, warehouseId?: number): Promise<OperationalBinSearchResult[]>;
	lookupOperationalBin(barcode: string): Promise<OperationalBinLookup>;
}
