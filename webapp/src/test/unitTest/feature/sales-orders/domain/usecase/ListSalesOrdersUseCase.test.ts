import { describe, expect, it, vi } from 'vitest';
import { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import type { SalesOrder } from '../../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

function emptyOrder(partial: Partial<SalesOrder> = {}): SalesOrder {
	return {
		id: 1,
		soNumber: 'SO-1',
		barcode: null,
		status: 'OPEN',
		warehouseId: 1,
		customerId: null,
		customerName: 'Acme',
		customerEmail: null,
		customerPhone: null,
		customerAddress: null,
		shipAddress: null,
		shipMethod: null,
		orderType: null,
		orderOrigin: null,
		parentSoId: null,
		parentSoNumber: null,
		memo: null,
		orderTotal: null,
		customerShippingPaid: null,
		lines: [],
		createdAt: null,
		pickedAt: null,
		shippedAt: null,
		...partial
	};
}

describe('ListSalesOrdersUseCase', () => {
	it('forwards trimmed filters to repository', async () => {
		const list = vi.fn(async () => [emptyOrder()]);
		const repo = { list } as unknown as SalesOrderRepository;
		const useCase = new ListSalesOrdersUseCase(repo);

		await useCase.execute({ status: ' OPEN ', warehouseId: 2, page: 1, perPage: 50, q: '  SO ' });

		expect(list).toHaveBeenCalledWith({
			status: 'OPEN',
			warehouseId: 2,
			page: 1,
			perPage: 50,
			q: 'SO'
		});
	});

	it('rejects invalid page', async () => {
		const repo = { list: vi.fn() } as unknown as SalesOrderRepository;
		const useCase = new ListSalesOrdersUseCase(repo);
		expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
	});

	it('rejects invalid warehouseId', async () => {
		const repo = { list: vi.fn() } as unknown as SalesOrderRepository;
		const useCase = new ListSalesOrdersUseCase(repo);
		expect(() => useCase.execute({ warehouseId: -1 })).toThrow(/warehouseId/);
	});
});
