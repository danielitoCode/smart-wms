import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../core/infrastructure/api/ApiClient';
import { ItemRemoteDataSource } from '../../core/feature/items/data/datasource/ItemRemoteDataSource';

afterEach(() => vi.unstubAllGlobals());

describe('Items HTTP integration', () => {
	it('connects the feature datasource to the shared HTTP client', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
			items: [{ item_id: 12, sku: 'SKU-12', item_name: 'Caja', is_active: true }],
			total: 1, page: 2, per_page: 50, pages: 1
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		const source = new ItemRemoteDataSource(new ApiClient('https://wms.test'));
		const rows = await source.list({ active: false, q: 'SKU-12', page: 2 });
		expect(fetchMock).toHaveBeenCalledWith('https://wms.test/api/admin/items?active=false&q=SKU-12&page=2', expect.objectContaining({ credentials: 'include', method: 'GET' }));
		expect(rows).toEqual([{ item_id: 12, sku: 'SKU-12', item_name: 'Caja', is_active: true }]);
	});
});
