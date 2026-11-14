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
});
