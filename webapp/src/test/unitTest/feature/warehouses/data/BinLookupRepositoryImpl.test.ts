import { describe, expect, it, vi } from 'vitest';
import { BinLookupRepositoryImpl } from '../../../../../core/feature/warehouses/data/repository/BinLookupRepositoryImpl';
import type { BinLookupRemoteDataSource } from '../../../../../core/feature/warehouses/data/datasource/BinLookupRemoteDataSource';

describe('BinLookupRepositoryImpl', () => {
	it('maps scanner search results without using the admin catalogue repository', async () => {
		const datasource = {
			search: vi.fn().mockResolvedValue([
				{ bin_id: 3, warehouse_id: 1, bin_code: 'A-01-01', bin_barcode: 'BC-01', bin_type: 'Pickable', zone_name: 'Picking', aisle: 'A', row_num: 1, level_num: 2 }
			]),
			lookupByBarcode: vi.fn()
		} as unknown as BinLookupRemoteDataSource;
		const repository = new BinLookupRepositoryImpl(datasource);
		await expect(repository.searchOperationalBins('A-01')).resolves.toMatchObject([
			{ id: 3, warehouseId: 1, code: 'A-01-01', binType: 'Pickable' }
		]);
	});

	it('maps barcode lookup inventory and preserves warehouse scope identity', async () => {
		const datasource = {
			search: vi.fn(),
			lookupByBarcode: vi.fn().mockResolvedValue({
				bin: { bin_id: 3, warehouse_id: 1, bin_code: 'A-01-01', bin_barcode: 'BC-01', bin_type: 'Pickable', zone_name: 'Picking', aisle: 'A', row_num: 1, level_num: 2 },
				items: [{ item_id: 9, sku: 'SKU-9', item_name: 'Item 9', upc: null, quantity_on_hand: 4, quantity_allocated: 1, quantity_available: 3, lot_number: null }]
			})
		} as unknown as BinLookupRemoteDataSource;
		const repository = new BinLookupRepositoryImpl(datasource);
		const result = await repository.lookupOperationalBin('BC-01');
		expect(result.bin.warehouseId).toBe(1);
		expect(result.items[0]).toMatchObject({ itemId: 9, quantityAvailable: 3 });
	});
});
