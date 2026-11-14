import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { VendorRemoteDataSource } from '../../../../../core/feature/vendors/data/datasource/VendorRemoteDataSource';

afterEach(() => vi.unstubAllGlobals());

const vendor = {
	canonical_id: 'a8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10',
	external_id: 'c5e3d40a-68dd-4f16-8a70-2ac3f7c12f80',
	vendor_name: 'Acme',
	contact_name: null,
	email: null,
	phone: null,
	billing_address: 'Street 1',
	remit_to_address: null,
	tax_id: null,
	payment_terms: 'Net 30',
	is_active: true,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-02T00:00:00Z'
};

describe('VendorRemoteDataSource HTTP contract', () => {
	it('serializes active, inactive and all filters with pagination and search', async () => {
		const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
			vendors: [vendor], total: 101, page: 2, per_page: 25, pages: 5
		}), { status: 200, headers: { 'Content-Type': 'application/json' } })));
		vi.stubGlobal('fetch', fetchMock);
		const source = new VendorRemoteDataSource(new ApiClient('https://wms.test'));

		const page = await source.list({ search: ' Acme & Sons ', filter: 'active', page: 2, perPage: 25 });
		await source.list({ filter: 'archived', page: 1, perPage: 25 });
		await source.list({ filter: 'all', page: 3, perPage: 10 });

		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			'https://wms.test/api/admin/vendors?page=2&per_page=25&q=+Acme+%26+Sons+&active=true',
			'https://wms.test/api/admin/vendors?page=1&per_page=25&active=false',
			'https://wms.test/api/admin/vendors?page=3&per_page=10'
		]);
		expect(page).toMatchObject({ total: 101, page: 2, per_page: 25, pages: 5 });
	});

	it('uses canonical_id for detail, update and delete URLs', async () => {
		const canonicalId = vendor.canonical_id;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({ vendor }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ vendor: { ...vendor, phone: '555' } }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const source = new VendorRemoteDataSource(new ApiClient('https://wms.test'));

		await source.getById(canonicalId);
		await source.update(canonicalId, { phone: '555' });
		await source.delete(canonicalId);

		expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
			[`https://wms.test/api/admin/vendors/${canonicalId}`, 'GET'],
			[`https://wms.test/api/admin/vendors/${canonicalId}`, 'PUT'],
			[`https://wms.test/api/admin/vendors/${canonicalId}`, 'DELETE']
		]);
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ body: JSON.stringify({ phone: '555' }) });
	});

	it('posts the Flask vendor fields and unwraps the created vendor', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ vendor }), { status: 201 }));
		vi.stubGlobal('fetch', fetchMock);
		const source = new VendorRemoteDataSource(new ApiClient('https://wms.test'));
		await source.create({ vendor_name: 'Acme', billing_address: 'Street 1', is_active: true });
		expect(fetchMock).toHaveBeenCalledWith('https://wms.test/api/admin/vendors', expect.objectContaining({
			method: 'POST', body: JSON.stringify({ vendor_name: 'Acme', billing_address: 'Street 1', is_active: true })
		}));
	});

	it.each([
		{ status: 403, code: 'forbidden', operation: 'permission' },
		{ status: 404, code: 'not_found', operation: 'missing vendor' },
		{ status: 409, code: 'conflict', operation: 'duplicate/conflict' },
		{ status: 422, code: 'unprocessable', operation: 'validation' }
	] as const)('normalizes $status ($operation) from Flask', async ({ status, code }) => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Vendor rejected' }), {
			status, headers: { 'Content-Type': 'application/json' }
		})));
		const source = new VendorRemoteDataSource(new ApiClient('https://wms.test'));
		await expect(source.create({ vendor_name: 'Acme' })).rejects.toMatchObject({ status, code });
	});

	it('requires the Flask delete acknowledgement', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ deleted: false }), { status: 200 })));
		const source = new VendorRemoteDataSource(new ApiClient('https://wms.test'));
		await expect(source.delete(vendor.canonical_id)).rejects.toThrow(/confirm deletion/);
	});
});
