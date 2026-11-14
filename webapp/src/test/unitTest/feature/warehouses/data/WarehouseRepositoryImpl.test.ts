import { describe, expect, it, vi } from 'vitest';
import { WarehouseRepositoryImpl } from '../../../../../core/feature/warehouses/data/repository/WarehouseRepositoryImpl';
import type { WarehouseRemoteDataSource } from '../../../../../core/feature/warehouses/data/datasource/WarehouseRemoteDataSource';

function row(id: number) {
	return { warehouse_id: id, warehouse_code: 'WH-' + id, warehouse_name: 'Warehouse ' + id, address: null, is_active: id !== 2, created_at: null };
}

describe('WarehouseRepositoryImpl', () => {
	it('preserves the paginated Flask envelope and warehouse_id identity', async () => {
		const datasource = {
			listAdminPage: vi.fn().mockResolvedValue({ warehouses: [row(8)], total: 101, page: 3, per_page: 50, pages: 3 })
		} as unknown as WarehouseRemoteDataSource;
		const repository = new WarehouseRepositoryImpl(datasource);
		await expect(repository.listAdminPage({ page: 3, perPage: 50 })).resolves.toEqual({
			items: [{ id: 8, code: 'WH-8', name: 'Warehouse 8', address: null, active: true, createdAt: null }],
			total: 101, page: 3, pages: 3, perPage: 50
		});
		expect(datasource.listAdminPage).toHaveBeenCalledWith(3, 50);
	});

	it('loads every admin page for the global warehouse selector', async () => {
		const datasource = {
			listAdminPage: vi.fn()
				.mockResolvedValueOnce({ warehouses: [row(1)], total: 2, page: 1, per_page: 1, pages: 2 })
				.mockResolvedValueOnce({ warehouses: [row(2)], total: 2, page: 2, per_page: 1, pages: 2 })
		} as unknown as WarehouseRemoteDataSource;
		const repository = new WarehouseRepositoryImpl(datasource);
		const result = await repository.listAdmin();
		expect(result.map(warehouse => warehouse.id)).toEqual([1, 2]);
		expect(result[1].active).toBe(false);
		expect(datasource.listAdminPage).toHaveBeenNthCalledWith(1, 1, 1000);
		expect(datasource.listAdminPage).toHaveBeenNthCalledWith(2, 2, 1000);
	});
	it('maps operational bin search and barcode lookup through the repository port', async () => {
		const datasource = {
			searchOperationalBins: vi.fn().mockResolvedValue([
				{ bin_id: 3, warehouse_id: 1, bin_code: 'A-01-01', bin_barcode: 'BC-01', bin_type: 'Pickable', zone_name: 'Picking', aisle: 'A', row_num: 1, level_num: 2 }
			]),
			lookupOperationalBin: vi.fn().mockResolvedValue({
				bin: { bin_id: 3, warehouse_id: 1, bin_code: 'A-01-01', bin_barcode: 'BC-01', bin_type: 'Pickable', zone_name: 'Picking', aisle: 'A', row_num: 1, level_num: 2 },
				items: [{ item_id: 9, sku: 'SKU-9', item_name: 'Item 9', upc: null, quantity_on_hand: 4, quantity_allocated: 1, quantity_available: 3, lot_number: null }]
			})
		} as unknown as WarehouseRemoteDataSource;
		const repository = new WarehouseRepositoryImpl(datasource);
		const matches = await repository.searchOperationalBins('A-01');
		expect(matches[0]).toMatchObject({ id: 3, warehouseId: 1, code: 'A-01-01' });
		const detail = await repository.lookupOperationalBin('BC-01');
		expect(detail.items[0]).toMatchObject({ itemId: 9, quantityAvailable: 3 });
		expect(datasource.searchOperationalBins).toHaveBeenCalledWith('A-01');
		expect(datasource.lookupOperationalBin).toHaveBeenCalledWith('BC-01');
	});

});
