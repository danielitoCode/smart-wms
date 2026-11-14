import { describe, expect, it, vi } from 'vitest';
import { WarehouseRemoteDataSource } from '../../../../../core/feature/warehouses/data/datasource/WarehouseRemoteDataSource';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';

function createApi() {
	return {
		get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn()
	} as unknown as ApiClient;
}

describe('WarehouseRemoteDataSource Flask contract', () => {
	it('requests the paginated admin collection without discarding its envelope', async () => {
		const api = createApi();
		const response = { warehouses: [{ warehouse_id: 8 }], total: 51, page: 2, per_page: 50, pages: 2 };
		vi.mocked(api.get).mockResolvedValue(response);
		const source = new WarehouseRemoteDataSource(api);
		await expect(source.listAdminPage(2, 50)).resolves.toEqual(response);
		expect(api.get).toHaveBeenCalledWith('/api/admin/warehouses?page=2&per_page=50');
	});

	it('uses warehouse_id as the detail, update and delete path identifier', async () => {
		const api = createApi();
		vi.mocked(api.get).mockResolvedValue({ warehouse: { warehouse_id: 8 }, zones: [] });
		vi.mocked(api.put).mockResolvedValue({ warehouse_id: 8 });
		vi.mocked(api.delete).mockResolvedValue({ message: 'Warehouse deleted' });
		const source = new WarehouseRemoteDataSource(api);
		await source.getById(8);
		await source.updateWarehouse(8, { is_active: false });
		await source.deleteWarehouse(8);
		expect(api.get).toHaveBeenCalledWith('/api/admin/warehouses/8');
		expect(api.put).toHaveBeenCalledWith('/api/admin/warehouses/8', { is_active: false });
		expect(api.delete).toHaveBeenCalledWith('/api/admin/warehouses/8');
	});

	it('sends only Flask-supported fields on warehouse creation', async () => {
		const api = createApi();
		vi.mocked(api.post).mockResolvedValue({ warehouse_id: 8 });
		const source = new WarehouseRemoteDataSource(api);
		const payload = { warehouse_code: 'WH-08', warehouse_name: 'Central', address: null };
		await source.createWarehouse(payload);
		expect(api.post).toHaveBeenCalledWith('/api/admin/warehouses', payload);
	});

	it('loads zone relationships for a warehouse detail', async () => {
		const api = createApi();
		vi.mocked(api.get).mockResolvedValue({ zones: [{ zone_id: 4, warehouse_id: 8 }] });
		const source = new WarehouseRemoteDataSource(api);
		await source.listZones(8);
		expect(api.get).toHaveBeenCalledWith('/api/admin/zones?warehouse_id=8');
	});
});
