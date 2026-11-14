import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../core/infrastructure/api/ApiClient';
import { ItemRemoteDataSource } from '../../core/feature/items/data/datasource/ItemRemoteDataSource';

afterEach(() => vi.unstubAllGlobals());

describe('Items HTTP integration', () => {
	it('requests and preserves the complete Flask paginated list envelope', async () => {
		const responseBody = {
			items: [{ item_id: 12, sku: 'SKU-12', item_name: 'Caja', is_active: true }],
			total: 101,
			page: 2,
			per_page: 25,
			pages: 5
		};
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		}));
		vi.stubGlobal('fetch', fetchMock);

		const source = new ItemRemoteDataSource(new ApiClient('https://wms.test'));
		const result = await source.listPage({ active: false, q: 'SKU-12', page: 2, perPage: 25 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://wms.test/api/admin/items?active=false&q=SKU-12&page=2&per_page=25',
			expect.objectContaining({ credentials: 'include', method: 'GET' })
		);
		expect(result).toEqual(responseBody);
		expect(result.items).toHaveLength(1);
		expect(result.total).toBe(101);
		expect(result.page).toBe(2);
		expect(result.per_page).toBe(25);
		expect(result.pages).toBe(5);
	});
});
