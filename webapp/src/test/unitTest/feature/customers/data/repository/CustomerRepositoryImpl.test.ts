import { describe, expect, it, vi } from 'vitest';
import { CustomerRepositoryImpl } from '../../../../../../core/feature/customers/data/repository/CustomerRepositoryImpl';
import type { CustomerRemoteDataSource } from '../../../../../../core/feature/customers/data/datasource/CustomerRemoteDataSource';

function source(overrides: Partial<CustomerRemoteDataSource> = {}) {
	return {
		listSalesOrders: vi.fn().mockResolvedValue({ sales_orders: [{ so_id: 1, so_number: 'SO-1', customer_name: 'Acme', warehouse_id: 2 }], total: 120, page: 2, per_page: 50, pages: 3 }),
		search: vi.fn().mockResolvedValue([{ type: 'customer', label: 'Acme', id: 'Acme', sublabel: '120 orders' }]),
		searchSalesOrders: vi.fn().mockResolvedValue({ sales_orders: [], total: 0, page: 1, per_page: 50, pages: 1 }),
		getSalesOrderDetail: vi.fn().mockResolvedValue({ sales_order: { customer_email: null } }),
		...overrides
	} as unknown as CustomerRemoteDataSource;
}

describe('CustomerRepositoryImpl', () => {
	it('uses backend pagination instead of requesting a 1000-order dump', async () => {
		const remote = source();
		const page = await new CustomerRepositoryImpl(remote).list({ page: 2, perPage: 50, warehouseId: 2 });
		expect(remote.listSalesOrders).toHaveBeenCalledWith(2, 50, 2);
		expect(page).toMatchObject({ page: 2, perPage: 50, totalOrders: 120, totalPages: 3 });
		expect(page.customers).toHaveLength(1);
	});
	it('returns an empty customer page when the source has no orders', async () => {
		const remote = source({ listSalesOrders: vi.fn().mockResolvedValue({ sales_orders: [], total: 0, page: 1, per_page: 50, pages: 1 }) });
		const page = await new CustomerRepositoryImpl(remote).list();
		expect(page.customers).toEqual([]);
		expect(page.totalOrders).toBe(0);
	});
	it('filters customer history to exact normalized name when SO number search also matches', async () => {
		const remote = source({ searchSalesOrders: vi.fn().mockResolvedValue({ sales_orders: [
			{ so_id: 1, so_number: 'SO-1', customer_name: 'Acme' },
			{ so_id: 2, so_number: 'Acme-PO', customer_name: 'Other' },
			{ so_id: 3, so_number: 'SO-3', customer_name: ' acme ' }
		], total: 3, page: 1, per_page: 50, pages: 1 }) });
		const page = await new CustomerRepositoryImpl(remote).getOrders({ customerName: 'Acme' });
		expect(page.orders.map((order) => order.id)).toEqual([1, 3]);
	});
	it('combines the aggregate search count with contact data from a real order detail', async () => {
		const remote = source({
			searchSalesOrders: vi.fn().mockResolvedValue({ sales_orders: [{ so_id: 22, so_number: 'SO-22', customer_name: 'Acme', customer_phone: '555', customer_address: 'Main St', warehouse_id: 4 }], total: 1, page: 1, per_page: 50, pages: 1 }),
			search: vi.fn().mockResolvedValue([{ type: 'customer', label: 'Acme', id: 'Acme', sublabel: '120 orders' }]),
			getSalesOrderDetail: vi.fn().mockResolvedValue({ sales_order: { customer_email: 'acme@example.test', customer_phone: '555' } })
		});
		const detail = await new CustomerRepositoryImpl(remote).getDetail('Acme', 4);
		expect(detail).toMatchObject({ name: 'Acme', email: 'acme@example.test', orderCount: 120, phone: '555' });
		expect(remote.getSalesOrderDetail).toHaveBeenCalledWith(22);
	});

	it('returns null detail for customers with no matching orders', async () => {
		const remote = source();
		await expect(new CustomerRepositoryImpl(remote).getDetail('Missing')).resolves.toBeNull();
		expect(remote.getSalesOrderDetail).not.toHaveBeenCalled();
	});
	it('supports large histories through backend pages of 50', async () => {
		const remote = source({ searchSalesOrders: vi.fn().mockResolvedValue({
			sales_orders: Array.from({ length: 50 }, (_, index) => ({ so_id: index + 51, so_number: 'SO-' + (index + 51), customer_name: 'Many Orders' })),
			total: 120, page: 2, per_page: 50, pages: 3
		}) });
		const page = await new CustomerRepositoryImpl(remote).getOrders({ customerName: 'Many Orders', page: 2, perPage: 50 });
		expect(page.orders).toHaveLength(50);
		expect(page.page).toBe(2);
		expect(page.totalPages).toBe(3);
		expect(remote.searchSalesOrders).toHaveBeenCalledWith('Many Orders', 2, 50, undefined);
	});
});
