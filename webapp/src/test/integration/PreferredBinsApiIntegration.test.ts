import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../core/infrastructure/api/ApiClient';
import { PreferredBinsRemoteDataSource } from '../../core/feature/preferred-bins/data/datasource/PreferredBinsRemoteDataSource';

afterEach(() => vi.unstubAllGlobals());

describe('Preferred Bins HTTP integration', () => {
	it('uses the scoped list, create and relation-id mutation contracts', async () => {
		const row = {
			preferred_bin_id: 91, item_id: 7, bin_id: 42, warehouse_id: 3, priority: 1,
			updated_at: null, sku: 'SKU-7', item_name: 'Test item', bin_code: 'PICK-42', zone_name: 'Picking'
		};
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ preferred_bins: [row] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Preferred bin saved' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Priority updated' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Preferred bin deleted' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);

		const source = new PreferredBinsRemoteDataSource(new ApiClient('https://wms.test'));
		const catalog = await source.catalog({ warehouseId: 3 });
		expect(catalog.warehouses).toEqual([]);
		const rows = await source.list({ search: 'SKU-7', warehouseId: 3 });
		expect(rows).toEqual([row]);
		await source.create({ item_id: 7, bin_id: 42, priority: 1 });
		await source.update(91, { priority: 2 });
		await source.remove(91);

		expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
			['https://wms.test/api/admin/preferred-bins/catalog?warehouse_id=3', 'GET'],
			['https://wms.test/api/admin/preferred-bins?q=SKU-7&warehouse_id=3', 'GET'],
			['https://wms.test/api/admin/preferred-bins', 'POST'],
			['https://wms.test/api/admin/preferred-bins/91', 'PUT'],
			['https://wms.test/api/admin/preferred-bins/91', 'DELETE']
		]);
		expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ item_id: 7, bin_id: 42, priority: 1 });
		expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({ priority: 2 });
	});
});
