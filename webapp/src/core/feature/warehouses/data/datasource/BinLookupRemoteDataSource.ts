import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { OperationalBinLookupDto, OperationalBinSearchResultDto } from '../dto/WarehouseDto';

/** Flask lookup endpoints used by scanner and operational workflows, not admin catalogue screens. */
export class BinLookupRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	search(query: string, warehouseId?: number): Promise<OperationalBinSearchResultDto[]> {
		return this.api.get<OperationalBinSearchResultDto[]>('/api/lookup/bin/search', {
			query: { q: query, warehouse_id: warehouseId }
		});
	}

	lookupByBarcode(barcode: string): Promise<OperationalBinLookupDto> {
		return this.api.get<OperationalBinLookupDto>('/api/lookup/bin/' + encodeURIComponent(barcode));
	}
}
