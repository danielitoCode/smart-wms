import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../../core/infrastructure/api/ApiClient';
import { CustomerRemoteDataSource } from '../../../../../../core/feature/customers/data/datasource/CustomerRemoteDataSource';

describe('CustomerRemoteDataSource', () => {
	it('requests the real sales-order page with a bounded page size and warehouse scope', async () => {
		const get = vi.fn().mockResolvedValue({ sales_orders: [], total: 120, page: 2, per_page: 50, pages: 3 });
		const source = new CustomerRemoteDataSource({ get } as unknown as ApiClient);
		await source.listSalesOrders(2, 50, 7);
		expect(get).toHaveBeenCalledWith('/api/admin/sales-orders?page=2&per_page=50&warehouse_id=7');
		expect(get.mock.calls[0][0]).not.toContain('per_page=1000');
	});

	it('uses the authenticated global search contract for customer search', async () => {
		const get = vi.fn().mockResolvedValue({ results: [{ type: 'customer', id: 'Acme', label: 'Acme', sublabel: '4 orders' }] });
		const source = new CustomerRemoteDataSource({ get } as unknown as ApiClient);
		const hits = await source.search('Acme', 9);
		expect(get).toHaveBeenCalledWith('/api/admin/search?q=Acme&warehouse_id=9');
		expect(hits).toHaveLength(1);
	});
});
