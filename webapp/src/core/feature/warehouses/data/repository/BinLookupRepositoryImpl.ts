import type { BinLookupRepository } from '../../domain/repository/BinLookupRepository';
import type { OperationalBinLookup, OperationalBinSearchResult } from '../../domain/entity/Warehouse';
import type { BinLookupRemoteDataSource } from '../datasource/BinLookupRemoteDataSource';
import { WarehouseMapper } from '../mapper/WarehouseMapper';

export class BinLookupRepositoryImpl implements BinLookupRepository {
	constructor(private readonly datasource: BinLookupRemoteDataSource) {}

	async searchOperationalBins(query: string): Promise<OperationalBinSearchResult[]> {
		return (await this.datasource.search(query)).map(WarehouseMapper.toOperationalBinSearchResult);
	}

	async lookupOperationalBin(barcode: string): Promise<OperationalBinLookup> {
		return WarehouseMapper.toOperationalBinLookup(await this.datasource.lookupByBarcode(barcode));
	}
}
