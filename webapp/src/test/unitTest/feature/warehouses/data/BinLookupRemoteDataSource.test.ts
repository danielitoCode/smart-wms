import { describe, expect, it, vi } from 'vitest';
import { BinLookupRemoteDataSource } from '../../../../../core/feature/warehouses/data/datasource/BinLookupRemoteDataSource';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';

describe('BinLookupRemoteDataSource operational Flask contract', () => {
	it('uses the dedicated bin search lookup endpoint', async () => {
		const api = { get: vi.fn().mockResolvedValue([]) } as unknown as ApiClient;
		const source = new BinLookupRemoteDataSource(api);
		await expect(source.search('A 01')).resolves.toEqual([]);
		expect(api.get).toHaveBeenCalledWith('/api/lookup/bin/search', { query: { q: 'A 01', warehouse_id: undefined } });
	});

	it('constrains typeahead results to the selected warehouse', async () => {
		const api = { get: vi.fn().mockResolvedValue([]) } as unknown as ApiClient;
		const source = new BinLookupRemoteDataSource(api);
		await source.search('A-01', 7);
		expect(api.get).toHaveBeenCalledWith('/api/lookup/bin/search', { query: { q: 'A-01', warehouse_id: 7 } });
	});

	it('uses the barcode lookup endpoint and encodes the scanned value', async () => {
		const response = { bin: { bin_id: 3, warehouse_id: 1, bin_code: 'A-01-01', bin_barcode: 'BC/01', bin_type: 'Pickable', zone_name: 'Picking', aisle: 'A', row_num: 1, level_num: 1 }, items: [] };
		const api = { get: vi.fn().mockResolvedValue(response) } as unknown as ApiClient;
		const source = new BinLookupRemoteDataSource(api);
		await expect(source.lookupByBarcode('BC/01')).resolves.toEqual(response);
		expect(api.get).toHaveBeenCalledWith('/api/lookup/bin/BC%2F01');
	});
});
