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
		const fetchMock = vi.fn().mockImplementation(() =>
			Promise.resolve(new Response(JSON.stringify(responseBody), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}))
		);
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
	it('aborts an obsolete list request through the shared API client', async () => {
		const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => {
					reject(new DOMException('Aborted', 'AbortError'));
				});
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		const source = new ItemRemoteDataSource(new ApiClient('https://wms.test'));
		const controller = new AbortController();
		const pending = source.listPage({ q: 'obsolete', page: 1, perPage: 50 }, { signal: controller.signal });

		controller.abort();

		await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ status: 403, code: 'forbidden', method: 'GET', path: '/api/admin/items/7', action: 'detail' },
		{ status: 409, code: 'conflict', method: 'DELETE', path: '/api/admin/items/7', action: 'delete' },
		{ status: 422, code: 'unprocessable', method: 'POST', path: '/api/admin/items/7/archive', action: 'archive' }
	] as const)('normalizes HTTP $status for the $action operation', async ({ status, code, method, path, action }) => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
			message: `Rejected with ${status}`
		}), {
			status,
			headers: { 'Content-Type': 'application/json' }
		}));
		vi.stubGlobal('fetch', fetchMock);
		const source = new ItemRemoteDataSource(new ApiClient('https://wms.test'));

		const operation = action === 'detail'
			? source.getDetail(7)
			: action === 'delete'
				? source.delete(7)
				: source.archive(7);

		await expect(operation).rejects.toMatchObject({ status, code });
		expect(fetchMock).toHaveBeenCalledWith(
			`https://wms.test${path}`,
			expect.objectContaining({ method, credentials: 'include' })
		);
	});

	it('serializes active, archived and all filters with the requested pagination', async () => {
		const responseBody = { items: [], total: 0, page: 3, per_page: 20, pages: 0 };
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		}));
		vi.stubGlobal('fetch', fetchMock);
		const source = new ItemRemoteDataSource(new ApiClient('https://wms.test'));

		await source.listPage({ active: true, q: 'bolt', page: 3, perPage: 20 });
		await source.listPage({ active: false, page: 1, perPage: 20 });
		await source.listPage({ page: 2, perPage: 20 });

		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			'https://wms.test/api/admin/items?active=true&q=bolt&page=3&per_page=20',
			'https://wms.test/api/admin/items?active=false&page=1&per_page=20',
			'https://wms.test/api/admin/items?page=2&per_page=20'
		]);
	});

	it('requests detail, archive and delete through their Flask endpoints', async () => {
		const responses = [
			{ item: { item_id: 7, sku: 'SKU-7', item_name: 'Caja', is_active: true }, inventory: [], preferred_bins: [] },
			{ message: 'Item archived', is_active: false },
			null
		];
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify(responses[0]), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(responses[1]), { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);
		const source = new ItemRemoteDataSource(new ApiClient('https://wms.test'));

		await source.getDetail(7);
		await source.archive(7);
		await source.delete(7);

		expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
			['https://wms.test/api/admin/items/7', 'GET'],
			['https://wms.test/api/admin/items/7/archive', 'POST'],
			['https://wms.test/api/admin/items/7', 'DELETE']
		]);
	});

});
