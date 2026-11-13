import { describe, expect, it, vi } from 'vitest';
import { CreateSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/CreateSalesOrderUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';

describe('CreateSalesOrderUseCase', () => {
	it('requires soNumber, warehouseId and lines', async () => {
		const create = vi.fn();
		const repo = { create } as unknown as SalesOrderRepository;
		const useCase = new CreateSalesOrderUseCase(repo);

		expect(() =>
			useCase.execute({ soNumber: '  ', warehouseId: 1, lines: [{ itemId: 1, quantityOrdered: 1 }] })
		).toThrow(/soNumber/);

		expect(() =>
			useCase.execute({ soNumber: 'SO-1', warehouseId: 0, lines: [{ itemId: 1, quantityOrdered: 1 }] })
		).toThrow(/warehouseId/);

		expect(() => useCase.execute({ soNumber: 'SO-1', warehouseId: 1, lines: [] })).toThrow(/line/);
	});

	it('trims optional fields and delegates', async () => {
		const create = vi.fn(async (input) => input);
		const repo = { create } as unknown as SalesOrderRepository;
		const useCase = new CreateSalesOrderUseCase(repo);

		await useCase.execute({
			soNumber: ' SO-9 ',
			warehouseId: 3,
			customerName: ' Acme ',
			lines: [{ itemId: 10, quantityOrdered: 2 }]
		});

		expect(create).toHaveBeenCalledWith({
			soNumber: 'SO-9',
			warehouseId: 3,
			customerName: 'Acme',
			customerEmail: undefined,
			customerPhone: undefined,
			customerAddress: undefined,
			shipAddress: undefined,
			shipMethod: undefined,
			memo: undefined,
			lines: [{ itemId: 10, quantityOrdered: 2 }]
		});
	});
});
