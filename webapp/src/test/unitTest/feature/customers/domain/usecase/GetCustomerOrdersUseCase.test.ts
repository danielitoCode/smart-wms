import { describe, expect, it, vi } from 'vitest';
import { GetCustomerOrdersUseCase } from '../../../../../../core/feature/customers/domain/usecase/GetCustomerOrdersUseCase';
import type { CustomerRepository } from '../../../../../../core/feature/customers/domain/repository/CustomerRepository';

describe('GetCustomerOrdersUseCase', () => {
	it('forwards page size, page and warehouse to the repository', async () => {
		const getOrders = vi.fn().mockResolvedValue({ orders: [], page: 3, perPage: 50, matchingSalesOrders: 120, totalPages: 3 });
		const useCase = new GetCustomerOrdersUseCase({ getOrders } as unknown as CustomerRepository);
		await useCase.execute({ customerName: ' Acme ', page: 3, perPage: 50, warehouseId: 5 });
		expect(getOrders).toHaveBeenCalledWith({ customerName: 'Acme', page: 3, perPage: 50, warehouseId: 5 });
	});
	it('rejects invalid pagination and empty customer name', () => {
		const repository = { getOrders: vi.fn() } as unknown as CustomerRepository;
		const useCase = new GetCustomerOrdersUseCase(repository);
		expect(() => useCase.execute({ customerName: 'Acme', page: 0 })).toThrow(/page/);
		expect(() => useCase.execute({ customerName: 'Acme', perPage: 0 })).toThrow(/perPage/);
		expect(() => useCase.execute({ customerName: ' ' })).toThrow(/customerName/);
	});
});
